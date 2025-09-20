import { PrismaClient } from "./generated/prisma";
import {RedisManager} from "./poller"

export const prisma = new PrismaClient();
RedisManager.getInstance().pricePoller();

export { CandleService, Candle } from "./candleService";