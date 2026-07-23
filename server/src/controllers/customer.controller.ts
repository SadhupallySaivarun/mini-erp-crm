import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { customerService } from "../services/customer.service";
import { ApiError } from "../utils/ApiError";

export const customerController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { data, meta } = await customerService.list(req.query);
    return sendSuccess(res, 200, "Customers fetched", data, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.getById(req.params.id);
    return sendSuccess(res, 200, "Customer fetched", customer);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.create(req.body);
    return sendSuccess(res, 201, "Customer created", customer);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.update(req.params.id, req.body);
    return sendSuccess(res, 200, "Customer updated", customer);
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await customerService.delete(req.params.id);
    return sendSuccess(res, 200, "Customer deleted");
  }),

  addFollowUpNote: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const note = await customerService.addFollowUpNote(req.params.id, req.body.note, req.user.id);
    return sendSuccess(res, 201, "Follow-up note added", note);
  }),
};
