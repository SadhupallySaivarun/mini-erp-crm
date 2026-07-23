import { Router } from "express";
import { Role } from "@prisma/client";
import { productController } from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createProductSchema,
  updateProductSchema,
  listProductQuerySchema,
} from "../validators/product.validator";

const router = Router();

router.use(authenticate);

// Everyone can view products (needed to build challans, check stock, etc.)
const canView = requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS);
// Only Admin and Warehouse manage the product catalog.
const canManage = requireRole(Role.ADMIN, Role.WAREHOUSE);

router.get("/low-stock", canView, productController.lowStock);
router.get("/", canView, validate(listProductQuerySchema, "query"), productController.list);
router.get("/:id", canView, productController.getById);
router.post("/", canManage, validate(createProductSchema), productController.create);
router.put("/:id", canManage, validate(updateProductSchema), productController.update);
router.delete("/:id", requireRole(Role.ADMIN), productController.delete);

export default router;
