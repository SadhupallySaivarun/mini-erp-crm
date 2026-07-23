import { ChallanStatus, StockMovementType } from "@prisma/client";
import { prisma } from "../config/db";
import { challanRepository } from "../repositories/challan.repository";
import { customerRepository } from "../repositories/customer.repository";
import { ApiError } from "../utils/ApiError";
import { buildPaginationMeta, parsePagination } from "../types/common";
import { generateChallanNumber } from "../utils/challanNumber";
import { CreateChallanInput, UpdateChallanInput } from "../validators/challan.validator";

export const challanService = {
  async list(query: any) {
    const { page, limit, skip } = parsePagination(query);
    const { data, total } = await challanRepository.list({
      skip,
      take: limit,
      status: query.status,
      customerId: query.customerId,
      search: query.search,
    });
    return { data, meta: buildPaginationMeta(total, page, limit) };
  },

  async getById(id: string) {
    const challan = await challanRepository.findById(id);
    if (!challan) throw ApiError.notFound("Sales challan not found");
    return challan;
  },

  /**
   * Creates a challan as DRAFT or CONFIRMED.
   * - Always stores a product snapshot (name/sku/price) at creation time.
   * - If status = CONFIRMED, stock is validated and deducted atomically,
   *   with a StockMovement (OUT) log created per line item.
   * - Never allows stock to go negative; throws 400 with a clear message.
   */
  async create(input: CreateChallanInput, createdById: string) {
    const customer = await customerRepository.findById(input.customerId);
    if (!customer) throw ApiError.notFound("Customer not found");

    // Fetch fresh product data to snapshot + validate stock.
    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== new Set(productIds).size) {
      throw ApiError.badRequest("One or more products in the challan do not exist");
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    if (input.status === ChallanStatus.CONFIRMED) {
      for (const item of input.items) {
        const product = productMap.get(item.productId)!;
        if (product.currentStock < item.quantity) {
          throw ApiError.badRequest(
            `Insufficient stock for '${product.name}'. Available: ${product.currentStock}, requested: ${item.quantity}`
          );
        }
      }
    }

    const challanNumber = await generateChallanNumber();

    const itemsWithSnapshot = input.items.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitPrice: product.unitPrice,
        quantity: item.quantity,
      };
    });

    // Transaction: create challan + items, and if CONFIRMED, deduct stock
    // and write stock movement logs — all or nothing.
    return prisma.$transaction(async (tx) => {
      const totalQuantity = itemsWithSnapshot.reduce((sum, i) => sum + i.quantity, 0);

      const challan = await tx.salesChallan.create({
        data: {
          challanNumber,
          customerId: input.customerId,
          createdById,
          status: input.status,
          totalQuantity,
          items: { create: itemsWithSnapshot },
        },
        include: { items: true, customer: true },
      });

      if (input.status === ChallanStatus.CONFIRMED) {
        for (const item of itemsWithSnapshot) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: StockMovementType.OUT,
              reason: `Sales challan ${challan.challanNumber} confirmed`,
              createdById,
            },
          });
        }
      }

      return challan;
    });
  },

  /**
   * Updates a DRAFT challan's items/customer. Only DRAFT challans are
   * editable — confirmed/cancelled challans are immutable history.
   */
  async update(id: string, input: UpdateChallanInput) {
    const existing = await this.getById(id);
    if (existing.status !== ChallanStatus.DRAFT) {
      throw ApiError.badRequest("Only DRAFT challans can be edited");
    }

    return prisma.$transaction(async (tx) => {
      if (input.items) {
        const productIds = input.items.map((i) => i.productId);
        const products = await tx.product.findMany({ where: { id: { in: productIds } } });
        if (products.length !== new Set(productIds).size) {
          throw ApiError.badRequest("One or more products in the challan do not exist");
        }
        const productMap = new Map(products.map((p) => [p.id, p]));

        await tx.challanItem.deleteMany({ where: { challanId: id } });

        const itemsWithSnapshot = input.items.map((item) => {
          const product = productMap.get(item.productId)!;
          return {
            challanId: id,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            unitPrice: product.unitPrice,
            quantity: item.quantity,
          };
        });

        await tx.challanItem.createMany({ data: itemsWithSnapshot });

        const totalQuantity = itemsWithSnapshot.reduce((sum, i) => sum + i.quantity, 0);
        await tx.salesChallan.update({
          where: { id },
          data: {
            totalQuantity,
            ...(input.customerId ? { customerId: input.customerId } : {}),
          },
        });
      } else if (input.customerId) {
        await tx.salesChallan.update({ where: { id }, data: { customerId: input.customerId } });
      }

      return tx.salesChallan.findUnique({
        where: { id },
        include: { items: true, customer: true },
      });
    });
  },

  /**
   * Confirms a DRAFT challan: validates stock is sufficient for every line
   * item, then deducts stock and writes stock movement logs atomically.
   * Prevents negative stock — if any single item is short, the whole
   * confirmation is rejected (no partial deduction).
   */
  async confirm(id: string, confirmedById: string) {
    const challan = await this.getById(id);

    if (challan.status !== ChallanStatus.DRAFT) {
      throw ApiError.badRequest(`Only DRAFT challans can be confirmed (current status: ${challan.status})`);
    }

    return prisma.$transaction(async (tx) => {
      // Re-check stock inside the transaction to avoid race conditions.
      for (const item of challan.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw ApiError.notFound(`Product '${item.productName}' no longer exists`);
        }
        if (product.currentStock < item.quantity) {
          throw ApiError.badRequest(
            `Insufficient stock for '${item.productName}'. Available: ${product.currentStock}, requested: ${item.quantity}`
          );
        }
      }

      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: StockMovementType.OUT,
            reason: `Sales challan ${challan.challanNumber} confirmed`,
            createdById: confirmedById,
          },
        });
      }

      return tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CONFIRMED },
        include: { items: true, customer: true },
      });
    });
  },

  /**
   * Cancels a challan. If it was CONFIRMED, stock is restored (reversal
   * IN movements are logged) so inventory stays accurate.
   */
  async cancel(id: string, cancelledById: string) {
    const challan = await this.getById(id);

    if (challan.status === ChallanStatus.CANCELLED) {
      throw ApiError.badRequest("Challan is already cancelled");
    }

    return prisma.$transaction(async (tx) => {
      if (challan.status === ChallanStatus.CONFIRMED) {
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: StockMovementType.IN,
              reason: `Sales challan ${challan.challanNumber} cancelled — stock restored`,
              createdById: cancelledById,
            },
          });
        }
      }

      return tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CANCELLED },
        include: { items: true, customer: true },
      });
    });
  },
};
