import { createClient } from 'redis'
import { RedisClientType } from 'redis'
import { prisma } from './index'

export interface TradeMessage {
  symbol: string;
  price: number;
  quantity: number;
  trade_time: Date;
}

export class RedisManager {
  private static instance: RedisManager
  private client: RedisClientType

  constructor() {
    this.client = createClient()
    this.client.connect().then(() => {
      console.log("Redis Connected Successfully");
    }).catch((err) => {
      console.error("Redis Connection Error:", err);
    });
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager()
    }
    return this.instance
  }

  public async pricePoller() {

    while (true) {
      try {
        const message = await this.client.rPop('toDB')

        if (message) {
          const trade: TradeMessage = JSON.parse(message)
          await prisma.trade.create({
            data: {
              symbol: trade.symbol,
              price: trade.price,
              quantity: trade.quantity,
              trade_time: trade.trade_time
            }
          })

        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error in price poller:', error)
        continue
      }
    }
  }
}