import { Worker } from "bullmq";
import redisConnection from "../config/redis.js";
import client from "../prismaclient.js";
import emailQueue from "../queues/emailqueue.js";

const worker = new Worker("payoutQueue",
    async (job) => {
        const vendors = await client.vendor.findMany({
            where: {
                pendingPayout: { gt: 0 },
                isApproved: true,
                transactions: {
                    none: {
                        isFlagged: true
                    }
                }
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
                const amount = vendor.pendingPayout;

                await client.vendor.update({
                    where: { id: vendor.id },
                    data: {
                        pendingPayout: 0,
                        totalEarnings: {
                            increment: amount
                        }
                    }
                });
                const vendorDetails = await client.vendor.findFirst({
                    where: {
                        id: vendor.id
                    },
                    include: {
                        user: true
                    }
                })
                await emailQueue.add("payout-success", {
                    email: vendorDetails?.user?.email,
                    name: vendorDetails?.user?.name,
                    subject: "Payout Processed",
                    body: "Your payout has been processed successfully"
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
                const vendorDetails = await client.vendor.findFirst({
                    where: {
                        id: vendor.id
                    },
                    include: {
                        user: true
                    }
                })

                await emailQueue.add("payout-failed", {
                    email: vendorDetails?.user?.email,
                    name: vendorDetails?.user?.name,
                    subject: "Payout Failed",
                    body: "Your payout has been failed . we will try again later"
                });
                await emailQueue.add("payout-failed-to-admin", {
                    email: "abhinavsyunary@gmail.com",
                    name: "Admin",
                    subject: "Payout Failed for " + vendorDetails?.user?.name,
                    body: "Your payout for " + vendorDetails?.user?.name + " has been failed ."
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
