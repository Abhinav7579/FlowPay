import type { Request, Response, NextFunction } from "express";
import redis from "../config/redis.js"
import client from "../prismaclient.js";

declare global {
    namespace Express {
        interface Request {
            user?: any;
            flag?: boolean;
            reasons?: string[];
        }
    }
}
export const fraudMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const reasons = [];
        let flag = false;
        const { amount, cardId, vendorId } = req.body;
        const ip = req.ip;
        const customerId = req.user.userId;
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const recentPayments = await client.transaction.count({
            where: {
                customerId,
                createdAt: {
                    gte: tenMinutesAgo
                }
            }
        });

        if (recentPayments >= 5) {
            flag = true;
            reasons.push("5+ payments in 10 minutes");
        }

        if (amount > 100000) {
            flag = true;
            reasons.push("Amount above ₹1,00,000");
        }

        const vendor = await client.vendor.findUnique({
            where: { id: vendorId }
        });
        if (vendor) {
            const first24HoursEnd = new Date(
                vendor.createdAt.getTime() + 24 * 60 * 60 * 1000
            );

            if (new Date() <= first24HoursEnd) {
                const totalReceived = await client.transaction.aggregate({
                    _sum: {
                        totalAmount: true
                    },
                    where: {
                        vendorId,
                        createdAt: {
                            gte: vendor.createdAt,
                            lte: first24HoursEnd
                        }
                    }
                });

                if ((totalReceived._sum.totalAmount || 0) + amount > 50000) {
                    flag = true;
                    reasons.push("New vendor exceeded ₹50,000");
                }
            }
        }

        const redisKey = `ip-cards:${ip}`;
        if (cardId) {
            await redis.sadd(redisKey, cardId);
            await redis.expire(redisKey, 86400);
        }
        const uniqueCards = await redis.scard(redisKey);

        if (uniqueCards >= 3) {
            flag = true;
            reasons.push("3+ cards from same IP");
        }

        req.flag = flag;
        req.reasons = reasons;
        next();
    }
    catch (err) {
        next(err);
    }

}
