import { api } from "./api";
import { ApiListResponse, ApiSingleResponse, SalesChallan } from "../types";

export interface ChallanListParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  search?: string;
}

export interface ChallanItemInput {
  productId: string;
  quantity: number;
}

export const challanService = {
  async list(params: ChallanListParams) {
    const res = await api.get<ApiListResponse<SalesChallan>>("/challans", { params });
    return res.data;
  },

  async getById(id: string) {
    const res = await api.get<ApiSingleResponse<SalesChallan>>(`/challans/${id}`);
    return res.data.data;
  },

  async create(payload: { customerId: string; items: ChallanItemInput[]; status?: "DRAFT" | "CONFIRMED" }) {
    const res = await api.post<ApiSingleResponse<SalesChallan>>("/challans", payload);
    return res.data.data;
  },

  async update(id: string, payload: { customerId?: string; items?: ChallanItemInput[] }) {
    const res = await api.put<ApiSingleResponse<SalesChallan>>(`/challans/${id}`, payload);
    return res.data.data;
  },

  async confirm(id: string) {
    const res = await api.patch<ApiSingleResponse<SalesChallan>>(`/challans/${id}/confirm`);
    return res.data.data;
  },

  async cancel(id: string) {
    const res = await api.patch<ApiSingleResponse<SalesChallan>>(`/challans/${id}/cancel`);
    return res.data.data;
  },
};
