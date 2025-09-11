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
  private static getTimeBucket(timestamp: Date, intervalMs: number): Date {
    const bucketTime = Math.floor(timestamp.getTime() / intervalMs) * intervalMs
    return new Date(bucketTime)
  }

  static async calculateCandle(
    symbol: string, 
    startTime: Date, 
    endTime: Date
  ): Promise<Candle | null> {
    const trades = await prisma.trade.findMany({
      where: {
        symbol,
        trade_time: {
          gte: startTime,
          lt: endTime
        }
      },
      orderBy: { trade_time: 'asc' }
    })

    if (trades.length === 0) return null

    return {
      symbol,
      timestamp: startTime,
      open: trades[0].price,
      high: Math.max(...trades.map(t => t.price)),
      low: Math.min(...trades.map(t => t.price)),
      close: trades[trades.length - 1].price,
      volume: trades.reduce((sum, t) => sum + t.quantity, 0)
    }
  }

  static async get1MinCandles(symbol: string, from: Date, to: Date): Promise<Candle[]> {
    const candles: Candle[] = []
    const interval = 60 * 1000 

    let current = this.getTimeBucket(from, interval)
    const end = this.getTimeBucket(to, interval)

    while (current <= end) {
      const candleEnd = new Date(current.getTime() + interval)
      const candle = await this.calculateCandle(symbol, current, candleEnd)
      
      if (candle) {
        candles.push(candle)
      }
      
      current = new Date(current.getTime() + interval)
    }

    return candles
  }

  static async get5MinCandles(symbol: string, from: Date, to: Date): Promise<Candle[]> {
    const candles: Candle[] = []
    const interval = 5 * 60 * 1000 
    let current = this.getTimeBucket(from, interval)
    const end = this.getTimeBucket(to, interval)

    while (current <= end) {
      const candleEnd = new Date(current.getTime() + interval)
      const candle = await this.calculateCandle(symbol, current, candleEnd)
      
      if (candle) {
        candles.push(candle)
      }
      
      current = new Date(current.getTime() + interval)
    }

    return candles
  }

  static async get1HourCandles(symbol: string, from: Date, to: Date): Promise<Candle[]> {
    const candles: Candle[] = []
    const interval = 60 * 60 * 1000 

    let current = this.getTimeBucket(from, interval)
    const end = this.getTimeBucket(to, interval)

    while (current <= end) {
      const candleEnd = new Date(current.getTime() + interval)
      const candle = await this.calculateCandle(symbol, current, candleEnd)
      
      if (candle) {
        candles.push(candle)
      }
      
      current = new Date(current.getTime() + interval)
    }

    return candles
  }

  static async get1DayCandles(symbol: string, from: Date, to: Date): Promise<Candle[]> {
    const candles: Candle[] = []
    const interval = 24 * 60 * 60 * 1000 

    let current = this.getTimeBucket(from, interval)
    const end = this.getTimeBucket(to, interval)

    while (current <= end) {
      const candleEnd = new Date(current.getTime() + interval)
      const candle = await this.calculateCandle(symbol, current, candleEnd)
      
      if (candle) {
        candles.push(candle)
      }
      
      current = new Date(current.getTime() + interval)
    }

    return candles
  }

  static async getLatestPrice(symbol: string): Promise<number | null> {
    const latestTrade = await prisma.trade.findFirst({
      where: { symbol },
      orderBy: { trade_time: 'desc' }
    })

    return latestTrade?.price || null
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