import express from "express";
import userRouter from "./user.js";
import vendorRouter from "./vendor.js";
const router = express.Router();

router.use("/user", userRouter);
router.use("/user/vendor", vendorRouter);
export default router;