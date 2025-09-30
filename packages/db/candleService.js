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
exports.CandleService = void 0;
const index_1 = require("./index");
class CandleService {
    static getClosestTime(timestamp, interval) {
        const time = Math.floor(timestamp.getTime() / interval) * interval;
        //timestamp.getTime() gives a numeric representation to the date
        return new Date(time);
    }
    static getCandles(symbol, startTime, endTime) {
        return __awaiter(this, void 0, void 0, function* () {
            const trades = yield index_1.prisma.trade.findMany({
                where: {
                    symbol,
                    trade_time: {
                        gte: startTime,
                        lt: endTime
                    }
                },
                orderBy: { trade_time: 'asc' }
            });
            if (trades.length == 0)
                return null;
            // Calculate high/low without spread operator to avoid stack overflow on large arrays
            let high = trades[0].price;
            let low = trades[0].price;
            for (const trade of trades) {
                if (trade.price > high)
                    high = trade.price;
                if (trade.price < low)
                    low = trade.price;
            }
            return {
                symbol: symbol,
                timestamp: startTime,
                open: trades[0].price,
                high: high,
                low: low,
                close: trades[trades.length - 1].price,
                volume: trades.reduce((acc, t) => acc + t.price, 0)
            };
        });
    }
    static get1MinCandles(symbol, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            const candles = [];
            const interval = 60 * 1000;
            let current = this.getClosestTime(from, interval);
            const end = this.getClosestTime(to, interval);
            while (current <= end) {
                const candleEnd = new Date(current.getTime() + interval);
                const candle = yield this.getCandles(symbol, current, candleEnd);
                if (candle) {
                    candles.push(candle);
                }
                current = new Date(current.getTime() + interval);
            }
            return candles;
        });
    }
    static get5MinCandles(symbol, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            const candles = [];
            const interval = 60 * 1000 * 5;
            let current = this.getClosestTime(from, interval);
            const end = this.getClosestTime(to, interval);
            while (current <= end) {
                const candleEnd = new Date(current.getTime() + interval);
                const candle = yield this.getCandles(symbol, current, candleEnd);
                if (candle) {
                    candles.push(candle);
                }
                current = new Date(current.getTime() + interval);
            }
            return candles;
        });
    }
    static get15MinCandles(symbol, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            const candles = [];
            const interval = 60 * 1000 * 15;
            let current = this.getClosestTime(from, interval);
            const end = this.getClosestTime(to, interval);
            while (current <= end) {
                const candleEnd = new Date(current.getTime() + interval);
                const candle = yield this.getCandles(symbol, current, candleEnd);
                if (candle) {
                    candles.push(candle);
                }
                current = new Date(current.getTime() + interval);
            }
            return candles;
        });
    }
    static get1HrCandles(symbol, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            const candles = [];
            const interval = 60 * 1000 * 60;
            let current = this.getClosestTime(from, interval);
            const end = this.getClosestTime(to, interval);
            while (current <= end) {
                const candleEnd = new Date(current.getTime() + interval);
                const candle = yield this.getCandles(symbol, current, candleEnd);
                if (candle) {
                    candles.push(candle);
                }
                current = new Date(current.getTime() + interval);
            }
            return candles;
        });
    }
    static get4HrCandles(symbol, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            const candles = [];
            const interval = 60 * 1000 * 60 * 4;
            let current = this.getClosestTime(from, interval);
            const end = this.getClosestTime(to, interval);
            // Process in batches to avoid stack overflow
            const batchSize = 10;
            const times = [];
            while (current <= end) {
                times.push(new Date(current));
                current = new Date(current.getTime() + interval);
            }
            // Process in batches
            for (let i = 0; i < times.length; i += batchSize) {
                const batch = times.slice(i, i + batchSize);
                const promises = batch.map(time => this.getCandles(symbol, time, new Date(time.getTime() + interval)));
                const results = yield Promise.all(promises);
                for (const candle of results) {
                    if (candle)
                        candles.push(candle);
                }
            }
            return candles;
        });
    }
    static get1DayCandles(symbol, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            const candles = [];
            const interval = 60 * 1000 * 60 * 24;
            let current = this.getClosestTime(from, interval);
            const end = this.getClosestTime(to, interval);
            // Process in batches to avoid stack overflow
            const batchSize = 10;
            const times = [];
            while (current <= end) {
                times.push(new Date(current));
                current = new Date(current.getTime() + interval);
            }
            // Process in batches
            for (let i = 0; i < times.length; i += batchSize) {
                const batch = times.slice(i, i + batchSize);
                const promises = batch.map(time => this.getCandles(symbol, time, new Date(time.getTime() + interval)));
                const results = yield Promise.all(promises);
                for (const candle of results) {
                    if (candle)
                        candles.push(candle);
                }
            }
            return candles;
        });
    }
    static getLatestPrice(symbol) {
        return __awaiter(this, void 0, void 0, function* () {
            const price = yield index_1.prisma.trade.findFirst({
                where: { symbol },
                orderBy: {
                    trade_time: 'desc'
                }
            });
            return (price === null || price === void 0 ? void 0 : price.price) || null;
        });
    }
    static getLatestBidPrice(symbol) {
        return __awaiter(this, void 0, void 0, function* () {
            const latestTrades = yield index_1.prisma.trade.findMany({
                where: { symbol },
                orderBy: {
                    trade_time: 'desc'
                },
                take: 10
            });
            if (latestTrades.length === 0)
                return null;
            return latestTrades[0].price;
        });
    }
    static getLatestAskPrice(symbol) {
        return __awaiter(this, void 0, void 0, function* () {
            const latestTrades = yield index_1.prisma.trade.findMany({
                where: { symbol },
                orderBy: {
                    trade_time: 'desc'
                },
                take: 10
            });
            if (latestTrades.length === 0)
                return null;
            return latestTrades[0].price;
        });
    }
    static getVolume(symbol, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield index_1.prisma.trade.aggregate({
                where: {
                    symbol,
                    trade_time: {
                        gte: from,
                        lte: to
                    }
                },
                _sum: {
                    quantity: true
                }
            });
            return result._sum.quantity || 0;
        });
    }
}
exports.CandleService = CandleService;
