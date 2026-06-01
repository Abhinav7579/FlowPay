import express from "express"
const adminRouter = express.Router();
import client from "../prismaclient.js";
import payoutQueue from "../queues/payoutqueue.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleCheck } from "../middleware/roleMiddleware.js";
adminRouter.get("/", authMiddleware, roleCheck("ADMIN"), (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to admin route"
    })
});

adminRouter.get("/pending-vendors", authMiddleware, roleCheck("ADMIN"), async (req, res) => {

    try {
        const pendingVendors = await client.vendor.findMany({
            where: {
                isApproved: false
            }
        });
        res.status(200).json({
            success: true,
            message: "List of pending vendors",
            data: pendingVendors
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }
})

adminRouter.post("/approve-vendor/:vendorId", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    const vendorId = req.params.vendorId;
    if (typeof vendorId !== "string") {
        throw new Error("Invalid vendor id");
    }
    try {
        const vendor = await client.vendor.update({
            where: {
                id: vendorId
            },
            data: {
                isApproved: true
            }
        });
        res.status(200).json({
            success: true,
            message: "Vendor approved successfully",
            data: vendor
        });

    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }
});

// adminRouter.get("/transactions",authMiddleware,roleCheck("ADMIN"),(req,res)=>{

// })

adminRouter.get("/payouts", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    try {
        const payouts = await client.payout.findMany({
            include: {
                vendor: true
            }
        });
        res.status(200).json({
            success: true,
            message: "List of payouts",
            data: payouts
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }
})

adminRouter.get("/revenue", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    try {
        const revenue = await client.platform.findFirst({
            where: {
                id: "da543ea2-ae27-4fac-9f97-f65ca7d87f9e"
            }
        })
        res.status(200).json({
            success: true,
            message: "Revenue",
            data: revenue
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }
})

adminRouter.post("/run-payout-now", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    await payoutQueue.add("manual-payout", {});
    res.json({ message: "Payout started" });
})
export default adminRouter;