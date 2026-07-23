import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { inventoryService } from "../services/inventory.service";
import { ApiError } from "../utils/ApiError";

export const inventoryController = {
  listMovements: asyncHandler(async (req: Request, res: Response) => {
    const movements = await inventoryService.listMovements(req.params.productId);
    return sendSuccess(res, 200, "Stock movements fetched", movements);
  }),

  recordMovement: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const movement = await inventoryService.recordMovement(req.body, req.user.id);
    return sendSuccess(res, 201, "Stock movement recorded", movement);
  }),
};
