import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { productService } from "../services/product.service";

export const productController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { data, meta } = await productService.list(req.query);
    return sendSuccess(res, 200, "Products fetched", data, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getById(req.params.id);
    return sendSuccess(res, 200, "Product fetched", product);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.create(req.body);
    return sendSuccess(res, 201, "Product created", product);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.update(req.params.id, req.body);
    return sendSuccess(res, 200, "Product updated", product);
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await productService.delete(req.params.id);
    return sendSuccess(res, 200, "Product deleted");
  }),

  lowStock: asyncHandler(async (_req: Request, res: Response) => {
    const products = await productService.lowStockList();
    return sendSuccess(res, 200, "Low stock products fetched", products);
  }),
};
