import { Router } from "express";
import authRoutes from "./auth.routes";
import customerRoutes from "./customer.routes";
import productRoutes from "./product.routes";
import inventoryRoutes from "./inventory.routes";
import challanRoutes from "./challan.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/customers", customerRoutes);
router.use("/products", productRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/challans", challanRoutes);

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "API is healthy", timestamp: new Date().toISOString() });
});

export default router;
