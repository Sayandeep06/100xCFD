import { PrismaClient } from "./generated/prisma";

export const prisma = new PrismaClient();


export { CandleService, Candle } from "./candleService";
export { RedisManager as DbRedisManager } from "./poller";