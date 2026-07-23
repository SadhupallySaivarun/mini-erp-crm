import { Router } from "express";
import { Role } from "@prisma/client";
import { inventoryController } from "../controllers/inventory.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { stockMovementSchema } from "../validators/product.validator";

const router = Router();

router.use(authenticate);

const canView = requireRole(Role.ADMIN, Role.WAREHOUSE, Role.ACCOUNTS);
const canManage = requireRole(Role.ADMIN, Role.WAREHOUSE);

router.get("/movements/:productId", canView, inventoryController.listMovements);
router.post("/movements", canManage, validate(stockMovementSchema), inventoryController.recordMovement);

export default router;
