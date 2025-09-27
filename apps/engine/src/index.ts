import {TradingEngine} from "./TradingEngine";
import {RedisManager} from "./RedisManager";

// Start the engine
TradingEngine.getInstance();

const redisManager = RedisManager.getInstance();
redisManager.startOrderProcessing();
redisManager.startUserProcessing();

// Export for use by other packages
export { TradingEngine } from "./TradingEngine";

