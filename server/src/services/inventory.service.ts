import { StockMovementType } from "@prisma/client";
import { prisma } from "../config/db";
import { productRepository } from "../repositories/product.repository";
import { ApiError } from "../utils/ApiError";
import { StockMovementInput } from "../validators/product.validator";

export const inventoryService = {
  async listMovements(productId: string) {
    await this._ensureProductExists(productId);
    return productRepository.listStockMovements(productId);
  },

  /**
   * Records a manual stock movement (IN or OUT) and updates the product's
   * currentStock atomically. OUT movements can never push stock negative.
   */
  async recordMovement(input: StockMovementInput, createdById: string) {
    const product = await this._ensureProductExists(input.productId);

    if (input.movementType === StockMovementType.OUT && product.currentStock < input.quantity) {
      throw ApiError.badRequest(
        `Insufficient stock for '${product.name}'. Available: ${product.currentStock}, requested: ${input.quantity}`
      );
    }

    const delta = input.movementType === StockMovementType.IN ? input.quantity : -input.quantity;

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId: input.productId,
          quantity: input.quantity,
          movementType: input.movementType,
          reason: input.reason,
          createdById,
        },
      }),
      prisma.product.update({
        where: { id: input.productId },
        data: { currentStock: { increment: delta } },
      }),
    ]);

    return movement;
  },

  async _ensureProductExists(productId: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw ApiError.notFound("Product not found");
    return product;
  },
};
