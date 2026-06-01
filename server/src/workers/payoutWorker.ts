import { Worker } from "bullmq";
import redisConnection from "../config/redis.js";
import client from "../prismaclient.js";

const worker = new Worker("payoutQueue",
    async (job) => {
        const vendors = await client.vendor.findMany({
            where: {
                pendingPayout: { gt: 0 },
                isApproved: true
            }
            , include: {
                user: { select: { email: true, name: true } }
            }
        })
        for (const vendor of vendors) {

            const payout = await client.payout.updateMany({
                where: {
                    vendorId: vendor.id,
                    status: "SCHEDULED"
                },
                data: {
                    status: "PROCESSING",
                    scheduledFor: new Date()
                }
            });
            try {
                await client.payout.updateMany({
                    where: {
                        vendorId: vendor.id,
                        status: "PROCESSING"
                    },
                    data: {
                        status: "COMPLETED",
                        processedAt: new Date()
                    }
                })
                await client.vendor.update({
                    where: { id: vendor.id },
                    data: { pendingPayout: 0 }
                });

            }
            catch (err) {
                await client.payout.updateMany({
                    where: {
                        vendorId: vendor.id,
                        status: "PROCESSING"
                    },
                    data: { status: "FAILED" }
                });
            }
        }

    },
    { connection: redisConnection }
);


console.log("Payout worker started...");


worker.on("completed", (job) => {
    console.log(`Payout Job ${job.id} completed`);
});
worker.on("failed", (job, err) => {
    console.log(`Payout Job ${job?.id} failed`);
    console.log(err);
});
