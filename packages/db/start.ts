import { DbRedisManager } from './index';

console.log("Starting DB Service...");
DbRedisManager.getInstance().pricePoller();
console.log("DB Service started");