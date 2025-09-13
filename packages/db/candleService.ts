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
        //timestamp.getTime() gives a numeric representation to the date
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
        return{
            symbol: symbol,
            timestamp: startTime,
            open: trades[0].price,
            high: Math.max(...trades.map(t => t.price)),
            low: Math.min(...trades.map(t=>t.price)),
            close: trades[trades.length-1].price,
            volume: trades.reduce((acc, t) => acc + t.price,0)
        }
    }
    static async get1MinCandles(symbol:string, from: Date, to: Date): Promise<Candles[] | null> {
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

            current = end
        }return candles
    }
    static async get5MinCandles(symbol:string, from: Date, to: Date): Promise<Candles[] | null> {
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

            current = end
        }return candles
    }
    static async get1HrCandles(symbol:string, from: Date, to: Date): Promise<Candles[] | null> {
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

            current = end
        }return candles
    }
    static async get1DayCandles(symbol:string, from: Date, to: Date): Promise<Candles[] | null> {
        const candles: Candle[] = []
        const interval = 60 * 1000 * 60 * 24

        let current = this.getClosestTime(from, interval)
        const end = this.getClosestTime(to, interval)

        while(current <= end){
            const candleEnd = new Date(current.getTime() + interval)
            const candle = await this.getCandles(symbol, current, candleEnd)

            if(candle){
                candles.push(candle)
            }

            current = end
        }return candles
    }
    static async getLatestPrice(symbol: string): Promise<number | null>{
        const price = prisma.trade.findFirst({
            where: {symbol},
            orderBy: {
                trade_time: 'desc'
            }
        })
        return price?.price || null
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