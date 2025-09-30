import {TradingEngine} from "./TradingEngine";
import {RedisManager} from "./RedisManager";

async function initialize() {
    TradingEngine.getInstance();

    const redisManager = RedisManager.getInstance();

    try {
        await redisManager.waitForReady();
    } catch (error) {
        console.error('Engine: Redis connection failed:', error);
        console.error('Engine: Orders cannot be processed without Redis');
        return;
    }

    redisManager.startOrderProcessing();
    redisManager.startUserProcessing();
}

initialize().catch(error => {
    console.error('Engine: Failed to initialize:', error);
});

export { TradingEngine } from "./TradingEngine";