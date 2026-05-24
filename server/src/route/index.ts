import express from "express";
import userRouter from "./user.js";
import vendorRouter from "./vendor.js";
import adminRouter from "./admin.js";
import productRouter from "./product.js";
const router = express.Router();

router.use("/user", userRouter);
router.use("/user/vendor", vendorRouter);
router.use("/user/admin", adminRouter);
router.use("/product", productRouter);
export default router;