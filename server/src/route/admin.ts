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

adminRouter.get("/flagged-transactions", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    try {
        const flaggedTransactions = await client.fraudAlert.findMany({
            where: {
                isResolved: false
            }
        });
        res.status(200).json({
            success: true,
            message: "List of flagged transactions",
            data: flaggedTransactions
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }
})

adminRouter.post("/flagged-transactions/:id/resolve", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    try {
        const { id } = req.params;
        if (typeof id !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid ID parameter"
            });
            return;
        }

        const fraud = await client.fraudAlert.findUnique({
            where: { id }
        });

        if (!fraud) {
            res.status(404).json({
                success: false,
                message: "Fraud alert not found"
            });
            return;
        }

        const vendorId = fraud.vendorId;
        if (!vendorId) {
            res.status(400).json({
                success: false,
                message: "No vendor associated with this fraud alert"
            });
            return;
        }

        // Get flagged transaction before updating
        const flaggedTransaction = await client.transaction.findFirst({
            where: {
                vendorId: vendorId,
                isFlagged: true
            }
        });

        await client.$transaction(async (prisma) => {
            // 1. Resolve fraud alert
            await prisma.fraudAlert.update({
                where: { id },
                data: { isResolved: true }
            });

            // 2. Unflag all vendor transactions
            await prisma.transaction.updateMany({
                where: {
                    vendorId: vendorId,
                    isFlagged: true
                },
                data: {
                    isFlagged: false,
                    flagReason: null
                }
            });

            // 3. Release vendor payout
            if (flaggedTransaction) {
                await prisma.vendor.update({
                    where: { id: vendorId },
                    data: {
                        pendingPayout: {
                            increment: flaggedTransaction.vendorAmount
                        }
                    }
                });
            }
        });

        return res.status(200).json({
            success: true,
            message: "Flag resolved and vendor payout released"
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }
});

adminRouter.post("/flagged-transactions/:id/deactivate-customer", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    const { id } = req.params;
    try {
        const fraud = await client.fraudAlert.findUnique({
            //@ts-ignore
            where: { id }
        })

        if (!fraud) {
            res.status(404).json({
                success: false,
                message: "Fraud alert not found"
            })
            return;
        }

        const customerId = fraud.userId;
        if(!customerId) {
            res.status(400).json({
                success: false,
                message: "No customer associated with this fraud alert"
            })
            return;
        }
        await client.user.update({
            where: { id: customerId },
            data: { isActive: false }
        });
        res.status(200).json({
            success: true,
            message: "Customer account deactivated"
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }

});








export default adminRouter;