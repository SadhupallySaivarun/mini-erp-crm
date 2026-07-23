import { customerRepository } from "../repositories/customer.repository";
import { ApiError } from "../utils/ApiError";
import { buildPaginationMeta, parsePagination } from "../types/common";
import { CreateCustomerInput, UpdateCustomerInput } from "../validators/customer.validator";

export const customerService = {
  async list(query: any) {
    const { page, limit, skip } = parsePagination(query);
    const { data, total } = await customerRepository.list({
      skip,
      take: limit,
      search: query.search,
      status: query.status,
      customerType: query.customerType,
    });
    return { data, meta: buildPaginationMeta(total, page, limit) };
  },

  async getById(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) throw ApiError.notFound("Customer not found");
    return customer;
  },

  create(input: CreateCustomerInput) {
    return customerRepository.create({
      name: input.name,
      mobile: input.mobile,
      email: input.email || undefined,
      businessName: input.businessName,
      gstNumber: input.gstNumber,
      customerType: input.customerType,
      address: input.address,
      status: input.status,
      followUpDate: input.followUpDate,
    });
  },

  async update(id: string, input: UpdateCustomerInput) {
    await this.getById(id);
    return customerRepository.update(id, input as any);
  },

  async delete(id: string) {
    await this.getById(id);
    return customerRepository.delete(id);
  },

  async addFollowUpNote(customerId: string, note: string, createdById: string) {
    await this.getById(customerId);
    return customerRepository.addFollowUpNote(customerId, note, createdById);
  },
};
