import { api } from "./api";
import { ApiListResponse, ApiSingleResponse, Customer } from "../types";

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerType?: string;
}

export const customerService = {
  async list(params: CustomerListParams) {
    const res = await api.get<ApiListResponse<Customer>>("/customers", { params });
    return res.data;
  },

  async getById(id: string) {
    const res = await api.get<ApiSingleResponse<Customer>>(`/customers/${id}`);
    return res.data.data;
  },

  async create(payload: Partial<Customer>) {
    const res = await api.post<ApiSingleResponse<Customer>>("/customers", payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<Customer>) {
    const res = await api.put<ApiSingleResponse<Customer>>(`/customers/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string) {
    await api.delete(`/customers/${id}`);
  },

  async addFollowUpNote(id: string, note: string) {
    const res = await api.post(`/customers/${id}/follow-up-notes`, { note });
    return res.data.data;
  },
};
