import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";
const payoutQueue = new Queue("payoutQueue", {
    connection: redisConnection,
});
export default payoutQueue;