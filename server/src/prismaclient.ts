import { PrismaClient } from "./generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config();

const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
})
export default client;
