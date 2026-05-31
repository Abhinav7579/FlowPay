import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";
const testQueue = new Queue("testQueue", {
    connection: redisConnection,
});
export default testQueue;