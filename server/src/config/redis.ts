import { Redis } from "ioredis";
const redisConnection = new Redis({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
});

export default redisConnection;

