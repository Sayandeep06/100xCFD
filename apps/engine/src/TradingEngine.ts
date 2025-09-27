import type { User, Position, MarketPrice, TradingEngineConfig, LiquidationEvent } from './types';
import { v4 as uuidv4 } from 'uuid';
import { CandleService } from 'db';

export class TradingEngine{
    private static instance: TradingEngine
    private users : Map<number, User> = new Map();
    private positions: Map<string, Position> = new Map();
    private prices: Map<string, MarketPrice> = new Map();
    private liquidations: LiquidationEvent[] = []
    private config: TradingEngineConfig

    private constructor(){
        this.config = {
            max_leverage: 100,
            max_position_size: 1000000,
            max_positions_per_user: 10
        }
        this.startPricePolling();
        this.loadInitialData();
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

        this.prices.set('BTCUSDT', {
            symbol: 'BTCUSDT',
            price: 101000,
            timestamp: new Date()
        });
    }

    private startPricePolling(): void {
        this.updatePrice().catch(error => {
            console.error('Error starting price polling:', error);
        });
    }
    public async placeOrder(
        userId: number,
        symbol: string,
        side: 'buy'| 'sell',
        margin: number,
        leverage: number
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
        const entry_price = marketData.price

        const quantity = position_size / entry_price

        const liquidation_price = side === 'buy'
            ? entry_price * (1 - 1/leverage)
            : entry_price * (1 + 1/leverage);

        user.balances.usd.available -= margin;
        user.balances.usd.used += margin;

        const position: Position = {
            positionId: uuidv4(),
            userId, symbol,
            side: side === 'buy' ? 'long' : 'short',
            leverage, margin, position_size, quantity, entry_price,
            current_price: entry_price,
            unrealized_pnl: 0, realized_pnl: 0, roi_percentage: 0,
            liquidation_price, margin_ratio: 1.0,
            status: 'open',
            opened_at: new Date()
        };
        this.positions.set(position.positionId, position)

        return position
    }

    async updatePrice() {
        const symbols = ['BTCUSDT'];

        const pollPrices = async () => {
            for (const symbol of symbols) {
                try {
                    const [bidPrice, askPrice] = await Promise.all([
                        CandleService.getLatestBidPrice(symbol),
                        CandleService.getLatestAskPrice(symbol)
                    ]);

                    if (bidPrice && askPrice && bidPrice > 0 && askPrice > 0) {
                        const midPrice = (bidPrice + askPrice) / 2;
                        this.prices.set(symbol, {
                            symbol,
                            price: midPrice,
                            timestamp: new Date()
                        });

                        console.log(`Updated ${symbol}: price=${midPrice} (from bid=${bidPrice}, ask=${askPrice})`);

                        this.updatePositionPrices(symbol, midPrice);
                    } else {
                        console.warn(`Invalid price data for ${symbol}: bid=${bidPrice}, ask=${askPrice}. Using existing prices for position updates.`);

                        const existingPrice = this.prices.get(symbol);
                        if (existingPrice) {
                            this.updatePositionPrices(symbol, existingPrice.price);
                        } else {
                            console.error(`No existing price data available for ${symbol}. Skipping position updates.`);
                        }
                    }
                } catch (error) {
                    console.error(`Error updating price for ${symbol}:`, error);

                    const existingPrice = this.prices.get(symbol);
                    if (existingPrice) {
                        console.warn(`Using existing price data for ${symbol} position updates due to fetch error.`);
                        this.updatePositionPrices(symbol, existingPrice.price);
                    } else {
                        console.error(`No fallback price data available for ${symbol}. Positions cannot be updated.`);
                    }
                }
            }
        };

        await pollPrices();

        setInterval(pollPrices, 1000);
    }
    private updatePositionPrices(symbol:string, currentPrice:number): void{
        for (const position of this.positions.values()) {
            if (position.symbol === symbol && position.status === 'open') {
                position.current_price = currentPrice;

                const price_diff = position.side === 'long'
                    ? currentPrice - position.entry_price
                    : position.entry_price - currentPrice;
                position.unrealized_pnl = price_diff * position.quantity;
                position.roi_percentage = (position.unrealized_pnl / position.margin) * 100;
                position.margin_ratio = (position.margin + position.unrealized_pnl) / position.margin;

                if (position.margin_ratio <= 0.01) {
                    console.log(`Liquidating ${position.positionId}: Price=${currentPrice}, Liquidation=${position.liquidation_price.toFixed(2)}, Margin Ratio=${(position.margin_ratio * 100).toFixed(1)}%`);
                    this.liquidatePosition(position.positionId, 'margin_call');
                }
            }
        }
    }
    private calculateUnrealisedPnL(position:Position):number{
        const price_diff = position.side === 'long'
            ? position.current_price - position.entry_price
            : position.entry_price - position.current_price;
        return price_diff * position.quantity;
    }

    getCurrentPrice(symbol: string): number | null {
        const marketPrice = this.prices.get(symbol);
        return marketPrice?.price || null;
    }

    getCurrentMarketPrice(symbol: string): MarketPrice | null {
        return this.prices.get(symbol) || null;
    }

    liquidatePosition(positionId: string, reason: 'margin_call'): void {
        const position = this.positions.get(positionId);
        if (!position || position.status !== 'open') return;

        const user = this.users.get(position.userId);
        if (!user) return;

        const final_pnl = position.unrealized_pnl;
        const net_pnl = final_pnl;

        const remaining_margin = Math.max(0, position.margin + net_pnl);
        const margin_lost = position.margin - remaining_margin;

        user.balances.usd.available += remaining_margin;
        user.balances.usd.used -= position.margin;

        position.status = 'liquidated';
        position.realized_pnl = final_pnl;
        position.closed_at = new Date();

        const liquidation: LiquidationEvent = {
            positionId,
            userId: position.userId,
            symbol: position.symbol,
            liquidation_price: position.current_price,
            margin_lost,
            timestamp: new Date(),
            reason
        };

        this.liquidations.push(liquidation);

        this.positions.delete(positionId);
    }

    closePosition(positionId: string, userId: number): Position {
        const position = this.positions.get(positionId);
        if (!position) throw new Error('Position not found');
        if (position.userId !== userId) throw new Error('Unauthorized');
        if (position.status !== 'open') throw new Error('Position not open');

        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');

        const net_pnl = position.unrealized_pnl;

        const final_amount = position.margin + net_pnl;
        user.balances.usd.available += final_amount;
        user.balances.usd.used -= position.margin;

        position.status = 'closed';
        position.realized_pnl = position.unrealized_pnl;
        position.closed_at = new Date();

        this.positions.delete(positionId);

        return position;
    }

    createUser(userId: number, username: string, password: string, startingBalance: number = 10000): User {
        if (this.users.has(userId)) {
            throw new Error(`User with ID ${userId} already exists`);
        }

        const newUser: User = {
            userId,
            username,
            password,
            balances: {
                usd: {
                    available: startingBalance,
                    used: 0
                }
            }
        };

        this.users.set(userId, newUser);

        return newUser;
    }

    authenticateUser(username: string, password: string): User | null {
        for (const user of this.users.values()) {
            if (user.username === username && user.password === password) {
                return user;
            }
        }
        return null;
    }

    findUserByUsername(username: string): User | null {
        for (const user of this.users.values()) {
            if (user.username === username) {
                return user;
            }
        }
        return null;
    }

    getUser(userId: number): User | undefined {
        return this.users.get(userId);
    }

    getUserPositions(userId: number): Position[] {
        return Array.from(this.positions.values())
            .filter(pos => pos.userId === userId);
    }

    getMarketPrice(symbol: string): MarketPrice | undefined {
        return this.prices.get(symbol);
    }

    getAllPrices(): Map<string, MarketPrice> {
        return this.prices;
    }

    getLiquidations(): LiquidationEvent[] {
        return this.liquidations;
    }
}