import { Router } from "express";
import testQueue from "../queues/testqueue.js";

const testRouter = Router();

testRouter.get("/", async (req, res) => {
    const job = await testQueue.add("hello-job", {
        message: "Hello BullMQ",
        time: new Date().toISOString(),
    });

    res.json({
        success: true,
        jobId: job.id,
    });
});

export default testRouter;