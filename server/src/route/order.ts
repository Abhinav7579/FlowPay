import express from 'express';
const orderRouter = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import client from "../prismaclient.js";
import dotenv from "dotenv"
import Razorpay from "razorpay";
import crypto from "crypto";
dotenv.config();
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

orderRouter.post('/create', authMiddleware, async (req, res) => {
    const productId = req.body.productId;
    const customerId = req.user.userId;

    const product = await client.product.findUnique({
        where: {
            id: productId
        }
    });
    if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
    }

    const options = {
        amount: product.price * 100, // rupess to paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
    }
    try {
        const order = await razorpay.orders.create(options);
        await client.transaction.create({
            data: {
                razorpayOrderId: order.id,
                customerId: customerId,
                vendorId: product.vendorId,
                productId: product.id,
                totalAmount: product.price,
                platformFee: product.price * 0.10,
                vendorAmount: product.price * 0.90,
                status: "PENDING"
            }
        });
        res.json({ orderId: order.id });
    }
    catch (err) {
        console.error("Error creating order: ", err);
        res.status(500).json({ message: "Failed to create order" });
    }

});

orderRouter.post('/verify', authMiddleware, async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        res.status(400).json({ message: "Missing verification parameters" });
        return;
    }

    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === razorpaySignature) {
        try {
            await client.transaction.update({
                where: { razorpayOrderId: razorpayOrderId },
                data: {
                    status: "SUCCESS",
                    razorpayPaymentId: razorpayPaymentId
                }
            });
            res.json({ success: true, message: "Payment verified successfully" });
        } catch (err) {
            console.error("Error updating transaction status: ", err);
            res.status(500).json({ message: "Failed to update transaction status" });
        }
    } else {
        res.status(400).json({ message: "Invalid payment signature" });
    }
});

export default orderRouter;