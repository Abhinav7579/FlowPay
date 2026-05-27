import express from "express";
import userRouter from "./user.js";
import vendorRouter from "./vendor.js";
import adminRouter from "./admin.js";
import productRouter from "./product.js";
import orderRouter from "./order.js";
import paymentRouter from "./payment.js";
const router = express.Router();

router.use("/user", userRouter);
router.use("/user/vendor", vendorRouter);
router.use("/user/admin", adminRouter);
router.use("/products", productRouter);
router.use("/orders", orderRouter);
router.use("/payments", paymentRouter);
export default router;