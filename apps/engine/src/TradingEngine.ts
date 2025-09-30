import type { User, Position, MarketPrice, TradingEngineConfig, LiquidationEvent } from './types';
import { v4 as uuidv4 } from 'uuid';
import { CandleService, prisma } from 'db';

export class TradingEngine{
    private static instance: TradingEngine
    private prices: Map<string, MarketPrice> = new Map();
    private config: TradingEngineConfig

    private constructor(){
        this.config = {
            max_leverage: 500,
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

    private async loadInitialData(){
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
        userId: number | bigint,
        symbol: string,
        side: 'buy'| 'sell',
        margin: number,
        leverage: number
    ){
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if(!user)   throw new Error("User not found")
        if(leverage > this.config.max_leverage){
            throw new Error(`Max leverage is ${this.config.max_leverage}x`)
        }
        if (user.available_usd < margin) {
            throw new Error(`Insufficient balance. Available: $${user.available_usd}, Required: $${margin}`);
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

        // Update user balance in DB
        await prisma.user.update({
            where: { id: userId },
            data: {
                available_usd: user.available_usd - margin,
                used_usd: user.used_usd + margin
            }
        });

        // Create position in DB
        const position = await prisma.position.create({
            data: {
                user_id: userId,
                symbol,
                side: side === 'buy' ? 'long' : 'short',
                leverage,
                margin,
                position_size,
                quantity,
                entry_price,
                current_price: entry_price,
                unrealized_pnl: 0,
                realized_pnl: 0,
                roi_percentage: 0,
                liquidation_price,
                margin_ratio: 1.0,
                status: 'open'
            }
        });

        return {
            positionId: position.id,
            userId: Number(position.user_id),
            symbol: position.symbol,
            side: position.side as 'long' | 'short',
            leverage: position.leverage,
            margin: position.margin,
            position_size: position.position_size,
            quantity: position.quantity,
            entry_price: position.entry_price,
            current_price: position.current_price,
            unrealized_pnl: position.unrealized_pnl,
            realized_pnl: position.realized_pnl,
            roi_percentage: position.roi_percentage,
            liquidation_price: position.liquidation_price,
            margin_ratio: position.margin_ratio,
            status: position.status as 'open' | 'closed' | 'liquidated',
            opened_at: position.opened_at,
            closed_at: position.closed_at || undefined
        } as Position;
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
    private async updatePositionPrices(symbol:string, currentPrice:number): Promise<void>{
        const positions = await prisma.position.findMany({
            where: {
                symbol,
                status: 'open'
            }
        });

        for (const position of positions) {
            const price_diff = position.side === 'long'
                ? currentPrice - position.entry_price
                : position.entry_price - currentPrice;
            const unrealized_pnl = price_diff * position.quantity;
            const roi_percentage = (unrealized_pnl / position.margin) * 100;
            const margin_ratio = (position.margin + unrealized_pnl) / position.margin;

            await prisma.position.update({
                where: { id: position.id },
                data: {
                    current_price: currentPrice,
                    unrealized_pnl,
                    roi_percentage,
                    margin_ratio
                }
            });

            if (margin_ratio <= 0.01) {
                await this.liquidatePosition(position.id, 'margin_call');
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

    async liquidatePosition(positionId: string, reason: 'margin_call'): Promise<void> {
        const position = await prisma.position.findUnique({
            where: { id: positionId }
        });

        if (!position || position.status !== 'open') return;

        const user = await prisma.user.findUnique({
            where: { id: position.user_id }
        });

        if (!user) return;

        const final_pnl = position.unrealized_pnl;
        const net_pnl = final_pnl;

        const remaining_margin = Math.max(0, position.margin + net_pnl);

        await prisma.user.update({
            where: { id: position.user_id },
            data: {
                available_usd: user.available_usd + remaining_margin,
                used_usd: user.used_usd - position.margin
            }
        });

        await prisma.position.update({
            where: { id: positionId },
            data: {
                status: 'liquidated',
                realized_pnl: final_pnl,
                closed_at: new Date()
            }
        });
    }

    async closePosition(positionId: string, userId: number | bigint): Promise<Position> {
        const position = await prisma.position.findUnique({
            where: { id: positionId }
        });

        if (!position) throw new Error('Position not found');
        if (position.user_id !== userId) throw new Error('Unauthorized');
        if (position.status !== 'open') throw new Error('Position not open');

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) throw new Error('User not found');

        const net_pnl = position.unrealized_pnl;
        const final_amount = position.margin + net_pnl;

        await prisma.user.update({
            where: { id: userId },
            data: {
                available_usd: user.available_usd + final_amount,
                used_usd: user.used_usd - position.margin
            }
        });

        const updatedPosition = await prisma.position.update({
            where: { id: positionId },
            data: {
                status: 'closed',
                realized_pnl: position.unrealized_pnl,
                closed_at: new Date()
            }
        });

        return {
            positionId: updatedPosition.id,
            userId: Number(updatedPosition.user_id),
            symbol: updatedPosition.symbol,
            side: updatedPosition.side as 'long' | 'short',
            leverage: updatedPosition.leverage,
            margin: updatedPosition.margin,
            position_size: updatedPosition.position_size,
            quantity: updatedPosition.quantity,
            entry_price: updatedPosition.entry_price,
            current_price: updatedPosition.current_price,
            unrealized_pnl: updatedPosition.unrealized_pnl,
            realized_pnl: updatedPosition.realized_pnl,
            roi_percentage: updatedPosition.roi_percentage,
            liquidation_price: updatedPosition.liquidation_price,
            margin_ratio: updatedPosition.margin_ratio,
            status: updatedPosition.status as 'open' | 'closed' | 'liquidated',
            opened_at: updatedPosition.opened_at,
            closed_at: updatedPosition.closed_at || undefined
        } as Position;
    }

    async createUser(userId: number | bigint, username: string, password: string, startingBalance: number = 10000): Promise<User> {
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (existingUser) {
            throw new Error(`User with ID ${userId} already exists`);
        }

        const dbUser = await prisma.user.create({
            data: {
                id: userId,
                username,
                password,
                available_usd: startingBalance,
                used_usd: 0
            }
        });

        return {
            userId: Number(dbUser.id),
            username: dbUser.username,
            password: dbUser.password,
            balances: {
                usd: {
                    available: dbUser.available_usd,
                    used: dbUser.used_usd
                }
            }
        };
    }

    async authenticateUser(username: string, password: string): Promise<User | null> {
        const dbUser = await prisma.user.findUnique({
            where: { username }
        });

        if (dbUser && dbUser.password === password) {
            return {
                userId: Number(dbUser.id),
                username: dbUser.username,
                password: dbUser.password,
                balances: {
                    usd: {
                        available: dbUser.available_usd,
                        used: dbUser.used_usd
                    }
                }
            };
        }

        return null;
    }

    async findUserByUsername(username: string): Promise<User | null> {
        const dbUser = await prisma.user.findUnique({
            where: { username }
        });

        if (dbUser) {
            return {
                userId: Number(dbUser.id),
                username: dbUser.username,
                password: dbUser.password,
                balances: {
                    usd: {
                        available: dbUser.available_usd,
                        used: dbUser.used_usd
                    }
                }
            };
        }

        return null;
    }

    async getUser(userId: number | bigint): Promise<User | undefined> {
        const dbUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (dbUser) {
            return {
                userId: Number(dbUser.id),
                username: dbUser.username,
                password: dbUser.password,
                balances: {
                    usd: {
                        available: dbUser.available_usd,
                        used: dbUser.used_usd
                    }
                }
            };
        }

        return undefined;
    }

    async getAllUsers(): Promise<User[]> {
        const dbUsers = await prisma.user.findMany();

        return dbUsers.map(dbUser => ({
            userId: Number(dbUser.id),
            username: dbUser.username,
            password: dbUser.password,
            balances: {
                usd: {
                    available: dbUser.available_usd,
                    used: dbUser.used_usd
                }
            }
        }));
    }

    async getUserPositions(userId: number | bigint): Promise<Position[]> {
        const dbPositions = await prisma.position.findMany({
            where: { user_id: userId }
        });

        return dbPositions.map(pos => ({
            positionId: pos.id,
            userId: Number(pos.user_id),
            symbol: pos.symbol,
            side: pos.side as 'long' | 'short',
            leverage: pos.leverage,
            margin: pos.margin,
            position_size: pos.position_size,
            quantity: pos.quantity,
            entry_price: pos.entry_price,
            current_price: pos.current_price,
            unrealized_pnl: pos.unrealized_pnl,
            realized_pnl: pos.realized_pnl,
            roi_percentage: pos.roi_percentage,
            liquidation_price: pos.liquidation_price,
            margin_ratio: pos.margin_ratio,
            status: pos.status as 'open' | 'closed' | 'liquidated',
            opened_at: pos.opened_at,
            closed_at: pos.closed_at || undefined
        }));
    }

    getMarketPrice(symbol: string): MarketPrice | undefined {
        return this.prices.get(symbol);
    }

    getAllPrices(): Map<string, MarketPrice> {
        return this.prices;
    }

    async getLiquidations(): Promise<Position[]> {
        const liquidatedPositions = await prisma.position.findMany({
            where: { status: 'liquidated' },
            orderBy: { closed_at: 'desc' }
        });

        return liquidatedPositions.map(pos => ({
            positionId: pos.id,
            userId: Number(pos.user_id),
            symbol: pos.symbol,
            side: pos.side as 'long' | 'short',
            leverage: pos.leverage,
            margin: pos.margin,
            position_size: pos.position_size,
            quantity: pos.quantity,
            entry_price: pos.entry_price,
            current_price: pos.current_price,
            unrealized_pnl: pos.unrealized_pnl,
            realized_pnl: pos.realized_pnl,
            roi_percentage: pos.roi_percentage,
            liquidation_price: pos.liquidation_price,
            margin_ratio: pos.margin_ratio,
            status: pos.status as 'open' | 'closed' | 'liquidated',
            opened_at: pos.opened_at,
            closed_at: pos.closed_at || undefined
        }));
    }
}