import express from "express"
const vendorRouter = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleCheck } from "../middleware/roleMiddleware.js";
import { bankSchema } from "../zod.js";
import client from "../prismaclient.js";

vendorRouter.get("/", authMiddleware, roleCheck("VENDOR"), async (req, res) => {
    try {
        const userId = req.user.userId;
        const vendor = await client.vendor.findUnique({
            where: {
                userId: userId
            }
        });
        res.status(200).json({
            success: true,
            message: "Welcome to vendor route",
            onboarded: !!vendor,
            vendor: vendor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error " + error
        });
    }
})
vendorRouter.post("/onboard", authMiddleware, roleCheck("VENDOR"), async (req, res) => {
    const pareseResult = bankSchema.safeParse(req.body);
    if (!pareseResult.success) {
        res.status(400).json({
            success: false,
            message: pareseResult.error.issues[0]?.message
        });
        return;
    }
    const { businessName, accountNumber, ifsc } = pareseResult.data;

    const userId = req.user.userId;
    try {
        const vendor = await client.vendor.create({
            data: {
                userId: userId,
                businessName: businessName,
                bankAccount: accountNumber,
                ifscCode: ifsc
            }
        });
        res.status(201).json({
            success: true,
            message: "Vendor onboarded successfully",
            data: vendor
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }

})

export default vendorRouter;