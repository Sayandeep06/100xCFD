import {TradingEngine} from "./TradingEngine";
import {RedisManager} from "./RedisManager";

// Initialize Trading Engine
TradingEngine.getInstance();

// Initialize and start Redis processing
const redisManager = RedisManager.getInstance();
redisManager.startOrderProcessing();
redisManager.startUserProcessing();

