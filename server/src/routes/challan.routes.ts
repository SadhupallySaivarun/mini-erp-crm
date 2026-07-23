import { Router } from "express";
import { Role } from "@prisma/client";
import { challanController } from "../controllers/challan.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createChallanSchema,
  updateChallanSchema,
  listChallanQuerySchema,
} from "../validators/challan.validator";

const router = Router();

router.use(authenticate);

const canView = requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS);
const canManage = requireRole(Role.ADMIN, Role.SALES);
// Warehouse also allowed to confirm (they physically dispatch stock).
const canConfirm = requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE);

router.get("/", canView, validate(listChallanQuerySchema, "query"), challanController.list);
router.get("/:id", canView, challanController.getById);
router.post("/", canManage, validate(createChallanSchema), challanController.create);
router.put("/:id", canManage, validate(updateChallanSchema), challanController.update);
router.patch("/:id/confirm", canConfirm, challanController.confirm);
router.patch("/:id/cancel", canManage, challanController.cancel);

export default router;
