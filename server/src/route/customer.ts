import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleCheck } from "../middleware/roleMiddleware.js";
import client from "../prismaclient.js";

const customerRouter = express.Router();

customerRouter.get("/transactions/my", authMiddleware, roleCheck("CUSTOMER"), async (req, res) => {
    const customerId = req.user.userId;
    try {
        const transactions = await client.transaction.findMany({
            where: {
                customerId: customerId
            },
            include: {
                product: { select: { name: true } },
                vendor: { select: { businessName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            message: "List of transactions",
            data: transactions
        });
    }

    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error" + error
        });
    }

})
export default customerRouter;