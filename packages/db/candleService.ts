import { prisma } from './index'

export interface Candle {
  symbol: string
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export class CandleService {
    private static instance: CandleService
    private static getClosestTime(timestamp: Date, interval: number): Date {
        const time = Math.floor(timestamp.getTime() / interval) * interval;
        return new Date(time);
    }
    static async getCandles(symbol: string, startTime: Date, endTime: Date): Promise<Candle | null> {
        const trades = await prisma.trade.findMany({
            where: {
                symbol,
                trade_time:{
                    gte: startTime,
                    lt: endTime
                }
            },
            orderBy: {trade_time: 'asc'}
        })
        if(trades.length == 0)      return null;

        let high = trades[0].price;
        let low = trades[0].price;
        for (const trade of trades) {
            if (trade.price > high) high = trade.price;
            if (trade.price < low) low = trade.price;
        }

        return{
            symbol: symbol,
            timestamp: startTime,
            open: trades[0].price,
            high: high,
            low: low,
            close: trades[trades.length-1].price,
            volume: trades.reduce((acc, t) => acc + t.price,0)
        }
    }
    static async get1MinCandles(symbol:string, from: Date, to: Date): Promise<Candle[]> {
        const candles: Candle[] = []
        const interval = 60 * 1000

        let current = this.getClosestTime(from, interval)
        const end = this.getClosestTime(to, interval)

        while(current <= end){
            const candleEnd = new Date(current.getTime() + interval)
            const candle = await this.getCandles(symbol, current, candleEnd)

            if(candle){
                candles.push(candle)
            }

            current = new Date(current.getTime() + interval)
        }return candles
    }
    static async get5MinCandles(symbol:string, from: Date, to: Date): Promise<Candle[]> {
        const candles: Candle[] = []
        const interval = 60 * 1000 * 5

        let current = this.getClosestTime(from, interval)
        const end = this.getClosestTime(to, interval)

        while(current <= end){
            const candleEnd = new Date(current.getTime() + interval)
            const candle = await this.getCandles(symbol, current, candleEnd)

            if(candle){
                candles.push(candle)
            }

            current = new Date(current.getTime() + interval)
        }return candles
    }
    static async get15MinCandles(symbol:string, from: Date, to: Date): Promise<Candle[]> {
        const candles: Candle[] = []
        const interval = 60 * 1000 * 15

        let current = this.getClosestTime(from, interval)
        const end = this.getClosestTime(to, interval)

        while(current <= end){
            const candleEnd = new Date(current.getTime() + interval)
            const candle = await this.getCandles(symbol, current, candleEnd)

            if(candle){
                candles.push(candle)
            }

            current = new Date(current.getTime() + interval)
        }return candles
    }
    static async get1HrCandles(symbol:string, from: Date, to: Date): Promise<Candle[]> {
        const candles: Candle[] = []
        const interval = 60 * 1000 * 60

        let current = this.getClosestTime(from, interval)
        const end = this.getClosestTime(to, interval)

        while(current <= end){
            const candleEnd = new Date(current.getTime() + interval)
            const candle = await this.getCandles(symbol, current, candleEnd)

            if(candle){
                candles.push(candle)
            }

            current = new Date(current.getTime() + interval)
        }return candles
    }
    static async get4HrCandles(symbol:string, from: Date, to: Date): Promise<Candle[]> {
        const candles: Candle[] = []
        const interval = 60 * 1000 * 60 * 4

        let current = this.getClosestTime(from, interval)
        const end = this.getClosestTime(to, interval)

        const batchSize = 10;
        const times: Date[] = [];

        while(current <= end){
            times.push(new Date(current));
            current = new Date(current.getTime() + interval);
        }

        for(let i = 0; i < times.length; i += batchSize) {
            const batch = times.slice(i, i + batchSize);
            const promises = batch.map(time =>
                this.getCandles(symbol, time, new Date(time.getTime() + interval))
            );
            const results = await Promise.all(promises);

            for(const candle of results) {
                if(candle) candles.push(candle);
            }
        }

        return candles;
    }
    static async get1DayCandles(symbol:string, from: Date, to: Date): Promise<Candle[]> {
        const candles: Candle[] = []
        const interval = 60 * 1000 * 60 * 24

        let current = this.getClosestTime(from, interval)
        const end = this.getClosestTime(to, interval)

        const batchSize = 10;
        const times: Date[] = [];

        while(current <= end){
            times.push(new Date(current));
            current = new Date(current.getTime() + interval);
        }

        for(let i = 0; i < times.length; i += batchSize) {
            const batch = times.slice(i, i + batchSize);
            const promises = batch.map(time =>
                this.getCandles(symbol, time, new Date(time.getTime() + interval))
            );
            const results = await Promise.all(promises);

            for(const candle of results) {
                if(candle) candles.push(candle);
            }
        }

        return candles;
    }
    static async getLatestPrice(symbol: string): Promise<number | null>{
        const price = await prisma.trade.findFirst({
            where: {symbol},
            orderBy: {
                trade_time: 'desc'
            }
        })
        return price?.price || null
    }

    static async getLatestBidPrice(symbol: string): Promise<number | null> {
        const latestTrades = await prisma.trade.findMany({
            where: {symbol},
            orderBy: {
                trade_time: 'desc'
            },
            take: 10
        })

        if (latestTrades.length === 0) return null

        return latestTrades[0].price
    }

    static async getLatestAskPrice(symbol: string): Promise<number | null> {
        const latestTrades = await prisma.trade.findMany({
            where: {symbol},
            orderBy: {
                trade_time: 'desc'
            },
            take: 10
        })

        if (latestTrades.length === 0) return null

        return latestTrades[0].price
    }
    static async getVolume(symbol: string, from: Date, to: Date): Promise<number> {
        const result = await prisma.trade.aggregate({
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
        })

        return result._sum.quantity || 0
    }
}