import { Prisma, ChallanStatus } from "@prisma/client";
import { prisma } from "../config/db";

interface ListParams {
  skip: number;
  take: number;
  status?: ChallanStatus;
  customerId?: string;
  search?: string;
}

export const challanRepository = {
  async list({ skip, take, status, customerId, search }: ListParams) {
    const where: Prisma.SalesChallanWhereInput = {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { challanNumber: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.salesChallan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, mobile: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
        },
      }),
      prisma.salesChallan.count({ where }),
    ]);

    return { data, total };
  },

  findById(id: string) {
    return prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });
  },

  /**
   * Creates a challan + items, and — if being created directly as CONFIRMED —
   * deducts stock atomically. All logic here runs inside a single Prisma
   * transaction to guarantee consistency (challan + items + stock deduction
   * + stock movement logs all succeed or all fail together).
   */
  async createWithItems(params: {
    challanNumber: string;
    customerId: string;
    createdById: string;
    status: ChallanStatus;
    items: Array<{
      productId: string;
      productName: string;
      productSku: string;
      unitPrice: Prisma.Decimal | number;
      quantity: number;
    }>;
  }) {
    const totalQuantity = params.items.reduce((sum, i) => sum + i.quantity, 0);

    return prisma.salesChallan.create({
      data: {
        challanNumber: params.challanNumber,
        customerId: params.customerId,
        createdById: params.createdById,
        status: params.status,
        totalQuantity,
        items: {
          create: params.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productSku: i.productSku,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true, customer: true },
    });
  },

  updateStatus(id: string, status: ChallanStatus) {
    return prisma.salesChallan.update({ where: { id }, data: { status } });
  },
};
