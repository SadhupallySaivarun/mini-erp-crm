import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";

interface ListParams {
  skip: number;
  take: number;
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}

export const productRepository = {
  async list({ skip, take, search, category, lowStockOnly }: ListParams) {
    const where: Prisma.ProductWhereInput = {
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // lowStockOnly needs a raw comparison between two columns; Prisma doesn't
    // support column-to-column filters in `where` directly, so we fetch and
    // filter, OR use a raw query. For clarity + correctness at this scale we
    // filter in two steps: first by normal where, then narrow by comparing.
    if (lowStockOnly) {
      const all = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
      const filtered = all.filter((p) => p.currentStock <= p.minStockAlert);
      const total = filtered.length;
      const data = filtered.slice(skip, skip + take);
      return { data, total };
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.product.count({ where }),
    ]);

    return { data, total };
  },

  findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  },

  findBySku(sku: string) {
    return prisma.product.findUnique({ where: { sku } });
  },

  create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data });
  },

  update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.product.delete({ where: { id } });
  },

  listStockMovements(productId: string) {
    return prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  },

  createStockMovement(data: Prisma.StockMovementCreateInput) {
    return prisma.stockMovement.create({ data });
  },
};
