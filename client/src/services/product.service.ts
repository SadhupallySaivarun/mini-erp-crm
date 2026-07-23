import { api } from "./api";
import { ApiListResponse, ApiSingleResponse, Product, StockMovement } from "../types";

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}

export const productService = {
  async list(params: ProductListParams) {
    const res = await api.get<ApiListResponse<Product>>("/products", { params });
    return res.data;
  },

  async getById(id: string) {
    const res = await api.get<ApiSingleResponse<Product>>(`/products/${id}`);
    return res.data.data;
  },

  async create(payload: Partial<Product>) {
    const res = await api.post<ApiSingleResponse<Product>>("/products", payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<Product>) {
    const res = await api.put<ApiSingleResponse<Product>>(`/products/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string) {
    await api.delete(`/products/${id}`);
  },

  async lowStock() {
    const res = await api.get<ApiSingleResponse<Product[]>>("/products/low-stock");
    return res.data.data;
  },
};

export const inventoryService = {
  async listMovements(productId: string) {
    const res = await api.get<ApiSingleResponse<StockMovement[]>>(`/inventory/movements/${productId}`);
    return res.data.data;
  },

  async recordMovement(payload: {
    productId: string;
    quantity: number;
    movementType: "IN" | "OUT";
    reason: string;
  }) {
    const res = await api.post<ApiSingleResponse<StockMovement>>("/inventory/movements", payload);
    return res.data.data;
  },
};
