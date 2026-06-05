import express from "express"
const adminRouter = express.Router();
import client from "../prismaclient.js";
import emailQueue from "../queues/emailqueue.js";
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
        const user = await client.vendor.findFirst({
            where: {
                id: vendorId
            }
        })
        if (!user) {
            throw new Error("Vendor not found");
        }
        const vendor = await client.vendor.update({
            where: {
                id: vendorId
            },
            data: {
                isApproved: true
            }
        });

        const userId = user.userId;
        const vendorDetails = await client.user.findFirst({
            where: {
                id: userId
            }
        })
        if (!vendorDetails) {
            throw new Error("Vendor not found");
        }

        await emailQueue.add("vendorApproved", {
            email: vendorDetails.email,
            name: vendorDetails.name,
            subject: "Vendor Approved",
            body: "Your vendor account has been approved successfully"

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

adminRouter.get("/transactions/stats", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    try {
        const gmvAggregation = await client.transaction.aggregate({
            _sum: {
                totalAmount: true,
                platformFee: true,
                vendorAmount: true
            },
            where: {
                status: "SUCCESS"
            }
        });

        const successfulTransactions = await client.transaction.count({
            where: { status: "SUCCESS" }
        });

        const failedTransactions = await client.transaction.count({
            where: { status: "FAILED" }
        });

        const pendingTransactions = await client.transaction.count({
            where: { status: "PENDING" }
        });

        const refundedTransactions = await client.transaction.count({
            where: { status: "REFUNDED" }
        });

        res.status(200).json({
            success: true,
            message: "Transaction stats retrieved successfully",
            data: {
                totalRevenue: gmvAggregation._sum.totalAmount || 0,
                totalPlatformEarnings: gmvAggregation._sum.platformFee || 0,
                totalVendorPayouts: gmvAggregation._sum.vendorAmount || 0,
                successfulTransactions,
                failedTransactions,
                pendingTransactions,
                refundedTransactions
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error: " + error
        });
    }
})

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
        if (!customerId) {
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

adminRouter.get("/top-5-vendors", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    try {
        const vendors = await client.vendor.findMany({
            orderBy: {
                totalEarnings: "desc"
            },
            take: 5,
            include: {
                user: true
            }
        });

        const mapped = vendors.map(vendor => {
            return {
                id: vendor.id,
                businessName: vendor.businessName,
                totalEarnings: vendor.totalEarnings,
                email: vendor.user.email,
                name: vendor.user.name
            }
        });
        res.status(200).json({
            success: true,
            message: "Top 5 vendors",
            data: mapped
        });

    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }
})

adminRouter.get("/dashboard/stats", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    try {
        const gmvAggregation = await client.transaction.aggregate({
            _sum: {
                totalAmount: true,
                platformFee: true
            },
            where: {
                status: "SUCCESS"
            }
        });

        const totalTransactions = await client.transaction.count();

        const successfulTransactions = await client.transaction.count({
            where: {
                status: "SUCCESS"
            }
        });

        const failedTransactions = await client.transaction.count({
            where: {
                status: "FAILED"
            }
        });

        const pendingTransactions = await client.transaction.count({
            where: {
                status: "PENDING"
            }
        });

        const activeVendors = await client.vendor.count({
            where: {
                isApproved: true
            }
        });

        const activeCustomers = await client.user.count({
            where: {
                role: "CUSTOMER"
            }
        });

        const transactions = await client.transaction.findMany({
            select: {
                id: true,
                totalAmount: true,
                platformFee: true,
                status: true,
                createdAt: true
            },
            orderBy: {
                createdAt: "asc"
            }
        });

        res.status(200).json({
            success: true,
            message: "Dashboard statistics retrieved successfully",
            data: {
                totalGMV: gmvAggregation._sum.totalAmount || 0,
                totalRevenue: gmvAggregation._sum.platformFee || 0,
                totalTransactions,
                successfulTransactions,
                failedTransactions,
                pendingTransactions,
                activeVendors,
                activeCustomers,
                transactions
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error: " + error
        });
    }
});

adminRouter.get("/transactions", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    try {
        const status = req.query.status as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;
        const customerSearch = req.query.customerSearch as string;
        const vendorSearch = req.query.vendorSearch as string;
        const orderIdSearch = req.query.orderIdSearch as string;
        const sort = req.query.sort as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                where.createdAt.gte = sDate;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = eDate;
            }
        }

        if (customerSearch) {
            where.customer = {
                OR: [
                    { name: { contains: customerSearch, mode: 'insensitive' } },
                    { email: { contains: customerSearch, mode: 'insensitive' } }
                ]
            };
        }

        if (vendorSearch) {
            where.vendor = {
                businessName: { contains: vendorSearch, mode: 'insensitive' }
            };
        }

        if (orderIdSearch) {
            where.OR = [
                { id: { contains: orderIdSearch, mode: 'insensitive' } },
                { razorpayOrderId: { contains: orderIdSearch, mode: 'insensitive' } },
                { razorpayPaymentId: { contains: orderIdSearch, mode: 'insensitive' } }
            ];
        }

        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'oldest') {
            orderBy = { createdAt: 'asc' };
        } else if (sort === 'highest') {
            orderBy = { totalAmount: 'desc' };
        } else if (sort === 'lowest') {
            orderBy = { totalAmount: 'asc' };
        }

        const transactions = await client.transaction.findMany({
            where,
            include: {
                customer: true,
                vendor: true,
                product: true
            },
            orderBy,
            skip: (page - 1) * limit,
            take: limit
        });

        const total = await client.transaction.count({ where });
        const pages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            message: "Transactions retrieved successfully",
            data: transactions,
            pagination: {
                total,
                page,
                limit,
                pages
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error: " + error
        });
    }
});

adminRouter.get("/transactions/:id", authMiddleware, roleCheck("ADMIN"), async (req, res) => {
    try {
        const { id } = req.params;
        if (typeof id !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid transaction ID"
            });
            return;
        }
        const transaction = await client.transaction.findUnique({
            where: { id },
            include: {
                customer: true,
                vendor: {
                    include: {
                        user: true
                    }
                },
                product: true
            }
        });

        if (!transaction) {
            res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Transaction details retrieved successfully",
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error: " + error
        });
    }
});

export default adminRouter;