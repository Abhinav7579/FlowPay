
import client from "./prismaclient.js";
import redis from "./config/redis.js";
const checkFraud = async ({ customerId, amount, vendorId, cardId, ip }: { customerId: string, amount: number, vendorId: string, cardId: string | null, ip: string }) => {
    try {
        const reasons = [];
        let flag = false;
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

        return { flag, reasons };

    }
    catch (err) {
        console.log(err);
        return { flag: false, reasons: [] };
    }


}
export default checkFraud;