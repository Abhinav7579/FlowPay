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
vendorRouter.get("/transactions", authMiddleware, roleCheck("VENDOR"), async (req, res) => {

    const userId = req.user.userId

    const vendor = await client.vendor.findUnique({
        where: { userId: userId }
    });

    if (!vendor) {
        res.status(404).json({ message: "Vendor not found" });
        return;
    }

    const transactions = await client.transaction.findMany({
        where: {
            vendorId: vendor.id
        },
        include: {
            product: { select: { name: true } },
            customer: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
        success: true,
        data: transactions
    });
})

vendorRouter.get("/payouts", authMiddleware, roleCheck("VENDOR"), async (req, res) => {
    const userId = req.user.userId
    const vendor = await client.vendor.findUnique({
        where: { userId: userId }
    });
    if (!vendor) {
        res.status(404).json({ message: "Vendor not found" });
        return;
    }
    const payouts = await client.payout.findMany({
        where: {
            vendorId: vendor.id
        },
        include: {
            vendor: true
        },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({
        success: true,
        data: payouts
    });
})
export default vendorRouter;