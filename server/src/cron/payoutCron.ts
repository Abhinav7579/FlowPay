import cron from "node-cron";
import payoutQueue from "../queues/payoutqueue.js";

cron.schedule("0 9 * * *", async () => {
    console.log("Scheduling payout job");

    await payoutQueue.add("daily-payout", {
        timestamp: Date.now()
    });
});