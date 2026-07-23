import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { challanService } from "../services/challan.service";
import { ApiError } from "../utils/ApiError";

export const challanController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { data, meta } = await challanService.list(req.query);
    return sendSuccess(res, 200, "Sales challans fetched", data, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const challan = await challanService.getById(req.params.id);
    return sendSuccess(res, 200, "Sales challan fetched", challan);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const challan = await challanService.create(req.body, req.user.id);
    return sendSuccess(res, 201, "Sales challan created", challan);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const challan = await challanService.update(req.params.id, req.body);
    return sendSuccess(res, 200, "Sales challan updated", challan);
  }),

  confirm: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const challan = await challanService.confirm(req.params.id, req.user.id);
    return sendSuccess(res, 200, "Sales challan confirmed and stock deducted", challan);
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const challan = await challanService.cancel(req.params.id, req.user.id);
    return sendSuccess(res, 200, "Sales challan cancelled", challan);
  }),
};
