import type { User, Order, Position, MarketPrice, TradingEngineConfig, LiquidationEvent } from './types';
import { v4 as uuidv4 } from 'uuid';
import {createClient} from "redis";
import { CandleService } from 'db';

export class TradingEngine{
    private static instance: TradingEngine
    private users : Map<number, User> = new Map();
    private positions: Map<string, Position> = new Map();
    private orders: Map<string, Order> = new Map();
    private prices: Map<string, MarketPrice> = new Map();
    private liquidations: LiquidationEvent[] = []
    private config: TradingEngineConfig
    private constructor(){
        this.config = {
            max_leverage: 100,
            max_position_size: 1000000,
            max_positions_per_user: 10,
            liquidation_buffer: 0.01
        }
        this.startPricePolling();
        this.loadInitialData();
        this.startPriceMonitoring();
    }
    public static getInstance(){
        if(!this.instance){
            this.instance = new TradingEngine();
        }return this.instance;
    }

    private loadInitialData(){
        this.users.set(1,{
            userId: 1,
            username: "Sayandeep",
            password: "abcde12345",
            balances: {
                usd: {
                    available: 20000,
                    used: 0
                }
            }
        });
    }

    private startPricePolling(): void {
        this.updatePrice().catch(error => {
            console.error('Error starting price polling:', error);
        });
    }
    async placeOrder(
        userId: number,
        symbol: string,
        side: 'buy'| 'sell',
        margin: number,
        leverage: number,
        orderType: 'market' | 'limit' = 'market',
        limitPrice?: number
    ){
        const user = this.users.get(userId)
        if(!user)   throw new Error("User not found")
        if(leverage > this.config.max_leverage){
            throw new Error(`Max leverage is ${this.config.max_leverage}x`)
        }
        if (user.balances.usd.available < margin) {
            throw new Error(`Insufficient balance. Available: $${user.balances.usd.available}, Required: $${margin}`);
        }
        const position_size = margin * leverage;
        if (position_size > this.config.max_position_size) {
            throw new Error(`Position size $${position_size} exceeds max $${this.config.max_position_size}`);
        }
        const marketData = this.prices.get(symbol);
        if (!marketData) {
            throw new Error(`Price data not available for ${symbol}`);
        }
        const entry_price = side === 'buy' ? marketData.ask : marketData.bid

        const quantity = position_size / entry_price

        const liquidation_price = side === 'buy'
            ? entry_price * (1 - 1/leverage)
            : entry_price * (1 + 1/leverage);

        user.balances.usd.available -= margin;
        user.balances.usd.used += margin;

        const position: Order = {
            orderId: uuidv4(),
            userId,
            symbol,
            side,
            type: orderType,
            leverage,
            margin,
            position_size,
            quantity,
            entry_price,
            current_price: entry_price,
            limit_price: limitPrice,
            liquidation_price,
            status: "filled",
            created_at: new Date(),
            filled_at: new Date()
        }
        this.orders.set(position.orderId, position);
        this.createPosition(position)

        return position
    }

    private createPosition(order: Order): Position{

    }
    async updatePrice() {
        const symbols = ['BTCUSD'];

        const pollPrices = async () => {
            for (const symbol of symbols) {
                try {
                    const [bidPrice, askPrice] = await Promise.all([
                        CandleService.getLatestBidPrice(symbol),
                        CandleService.getLatestAskPrice(symbol)
                    ]);

                    if (bidPrice && askPrice) {
                        this.prices.set(symbol, {
                            symbol,
                            bid: bidPrice,
                            ask: askPrice,
                            spread: askPrice - bidPrice,
                            timestamp: new Date()
                        });

                        console.log(`Updated ${symbol}: bid=${bidPrice}, ask=${askPrice}`);

                        this.updatePositionPrices(symbol, (bidPrice + askPrice) / 2);
                    }
                } catch (error) {
                    console.error(`Error updating price for ${symbol}:`, error);
                }
            }
        };

        await pollPrices();

        setInterval(pollPrices, 1000);
    }
    private updatePositionPrices(symbol:string, currentPrice:number): void{

    }
    private calculateUnrealisedPnL(position:Position):number{

    }
    private checkPositionLiquidation(position:Position){

    }

    getCurrentBidPrice(symbol: string): number | null {
        const marketPrice = this.prices.get(symbol);
        return marketPrice?.bid || null;
    }

    getCurrentAskPrice(symbol: string): number | null {
        const marketPrice = this.prices.get(symbol);
        return marketPrice?.ask || null;
    }

    getCurrentMarketPrice(symbol: string): MarketPrice | null {
        return this.prices.get(symbol) || null;
    }
}