import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { authService } from "../services/auth.service";
import { ApiError } from "../utils/ApiError";

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    return sendSuccess(res, 200, "Login successful", result);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const profile = await authService.getProfile(req.user.id);
    return sendSuccess(res, 200, "Profile fetched", profile);
  }),
};
