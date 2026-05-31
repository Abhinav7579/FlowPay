import { Worker } from "bullmq";
import redisConnection from "../config/redis.js";

new Worker(
    "testQueue",
    async (job) => {
        console.log("================================");
        console.log("JOB RECEIVED");
        console.log(job.data);
        console.log("================================");

        return true;
    },
    { connection: redisConnection }
);

console.log("Worker started...");