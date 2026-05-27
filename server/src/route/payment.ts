import express from 'express';
const paymentRouter = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import client from "../prismaclient.js";

paymentRouter.get('/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        if (typeof id !== 'string') {
             res.status(400).json({ message: "Invalid payment ID parameter" });
             return;
        }

        const transaction = await client.transaction.findFirst({
            where: {
                OR: [
                    { id: id },
                    { razorpayPaymentId: id },
                    { razorpayOrderId: id }
                ]
            },
            include: {
                product: true
            }
        });
        if (!transaction) {
            res.status(404).json({ message: "Payment not found" });
            return;
        }
        res.json(transaction);
    } catch (err) {
        console.error("Error fetching payment status: ", err);
        res.status(500).json({ message: "Failed to fetch payment status" });
    }
});

export default paymentRouter;
