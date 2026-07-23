import { Router } from "express";
import { Role } from "@prisma/client";
import { customerController } from "../controllers/customer.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomerQuerySchema,
  addFollowUpNoteSchema,
} from "../validators/customer.validator";

const router = Router();

// All customer routes require authentication.
router.use(authenticate);

// Admin, Sales, and Accounts can view customers. Warehouse has no CRM need.
const canView = requireRole(Role.ADMIN, Role.SALES, Role.ACCOUNTS);
// Only Admin and Sales manage customer records.
const canManage = requireRole(Role.ADMIN, Role.SALES);

router.get("/", canView, validate(listCustomerQuerySchema, "query"), customerController.list);
router.get("/:id", canView, customerController.getById);
router.post("/", canManage, validate(createCustomerSchema), customerController.create);
router.put("/:id", canManage, validate(updateCustomerSchema), customerController.update);
router.delete("/:id", requireRole(Role.ADMIN), customerController.delete);
router.post(
  "/:id/follow-up-notes",
  canManage,
  validate(addFollowUpNoteSchema),
  customerController.addFollowUpNote
);

export default router;
