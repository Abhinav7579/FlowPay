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

orderRouter.post("/webhook", async (req, res) => {
    const webhookSecret =process.env.RAZORPAY_WEBHOOK_SECRET || "";
    const signature =req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);
    const hmac = crypto.createHmac(
      'sha256',
      webhookSecret
    );
    hmac.update(body);
    const generatedSignature =hmac.digest('hex');
    if (generatedSignature === signature) {
        const event = JSON.parse(body);
        const eventType = event.event;
        if (eventType === "payment.failed" ||eventType === "payment.captured") {
            const payment =event.payload.payment.entity;
            const webhookId =`${eventType}_${payment.id}`;

            // IDEMPOTENCY CHECK
            const existing =await client.transaction.findUnique({
                where: {
                  webhookEventId :webhookId
                }
            });
            if (existing) {
                return res.json({
                  success: true,
                  message: "Already processed"
                });
            }
            if (eventType === "payment.failed") {
                await client.transaction.update({
                    where: {
                      razorpayOrderId:payment.order_id
                    },
                    data: {
                        webhookEventId:webhookId,
                        status: "FAILED"
                    }
                });

                console.log(
                  `Payment failed for order ${payment.order_id}`
                );
            }
            else {
                await client.transaction.update({
                    where: {
                      razorpayOrderId:payment.order_id
                    },
                    data: {
                        webhookEventId:webhookId,
                        status: "SUCCESS",
                        razorpayPaymentId:payment.id
                    }
                });
                console.log(
                  `Payment captured for order ${payment.order_id}`
                );
            }
        }

        // REFUND EVENT
        else if (eventType === "refund.processed") {

            const refund =event.payload.refund.entity;

            const webhookId =`${eventType}_${refund.id}`;

            // IDEMPOTENCY CHECK
            const existing =await client.transaction.findUnique({
                where: {
                  webhookEventId: webhookId
                }
            });
            if (existing) {
                return res.json({
                  success: true,
                  message: "Already processed"
                });
            }

            await client.transaction.updateMany({
                where: {
                    razorpayPaymentId: refund.payment_id
                },
                data: {
                    webhookEventId: webhookId,
                    status: "REFUNDED"
                }
            });
            console.log(
              `Refund processed for payment ${refund.payment_id}`
            );
        }
        return res.json({
          success: true
        });

    } else {
        return res.status(400).json({
          message: "Invalid webhook signature"
        });
    }
});

export default orderRouter;