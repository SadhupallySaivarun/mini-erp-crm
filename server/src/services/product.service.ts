import { productRepository } from "../repositories/product.repository";
import { ApiError } from "../utils/ApiError";
import { buildPaginationMeta, parsePagination } from "../types/common";
import { CreateProductInput, UpdateProductInput } from "../validators/product.validator";

export const productService = {
  async list(query: any) {
    const { page, limit, skip } = parsePagination(query);
    const { data, total } = await productRepository.list({
      skip,
      take: limit,
      search: query.search,
      category: query.category,
      lowStockOnly: query.lowStockOnly,
    });
    return { data, meta: buildPaginationMeta(total, page, limit) };
  },

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) throw ApiError.notFound("Product not found");
    return product;
  },

  async create(input: CreateProductInput) {
    const existing = await productRepository.findBySku(input.sku);
    if (existing) {
      throw ApiError.conflict(`A product with SKU '${input.sku}' already exists`);
    }
    return productRepository.create({
      name: input.name,
      sku: input.sku,
      category: input.category,
      unitPrice: input.unitPrice,
      currentStock: input.currentStock,
      minStockAlert: input.minStockAlert,
      location: input.location,
    });
  },

  async update(id: string, input: UpdateProductInput) {
    await this.getById(id);
    if (input.sku) {
      const existing = await productRepository.findBySku(input.sku);
      if (existing && existing.id !== id) {
        throw ApiError.conflict(`A product with SKU '${input.sku}' already exists`);
      }
    }
    return productRepository.update(id, input as any);
  },

  async delete(id: string) {
    await this.getById(id);
    return productRepository.delete(id);
  },

  async lowStockList() {
    const { data } = await productRepository.list({ skip: 0, take: 1000, lowStockOnly: true });
    return data;
  },
};
