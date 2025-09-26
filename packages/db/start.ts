import { DbRedisManager } from './index';

console.log('Starting database service...');
DbRedisManager.getInstance().pricePoller();