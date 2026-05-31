import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";
const emailQueue = new Queue("emailQueue", {
    connection: redisConnection,
});
export default emailQueue;