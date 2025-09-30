"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisManager = void 0;
const redis_1 = require("redis");
const index_1 = require("./index");
class RedisManager {
    constructor() {
        this.client = (0, redis_1.createClient)();
        this.client.connect();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager();
        }
        return this.instance;
    }
    pricePoller() {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                try {
                    const message = yield this.client.rPop('toDB');
                    if (message) {
                        const trade = JSON.parse(message);
                        yield index_1.prisma.trade.create({
                            data: {
                                symbol: trade.symbol,
                                price: trade.price,
                                quantity: trade.quantity,
                                trade_time: trade.trade_time
                            }
                        });
                    }
                    else {
                        continue;
                    }
                }
                catch (error) {
                    console.error('Error in price poller:', error);
                    continue;
                }
            }
        });
    }
}
exports.RedisManager = RedisManager;
