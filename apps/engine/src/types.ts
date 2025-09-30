export interface User {
    userId: number;
    username: string;
    password: string;
    balances: {
        usd: {
            available: number;
            used: number;
        };
    };
}

export interface MarketPrice {
    symbol: string;
    price: number;
    timestamp: Date;
}

export interface Order {
    orderId: string;
    userId: number;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';


    leverage: number;
    margin: number;
    position_size: number;
    quantity: number;


    entry_price: number;
    current_price?: number;
    limit_price?: number;


    stop_loss?: number;
    take_profit?: number;
    liquidation_price: number;


    status: 'filled' | 'cancelled' | 'liquidated';
    created_at: Date;
    filled_at?: Date;
    closed_at?: Date;
}

export interface Position {
    positionId: string;
    userId: number;
    symbol: string;
    side: 'long' | 'short';


    leverage: number;
    margin: number;
    position_size: number;
    quantity: number;
    entry_price: number;
    current_price: number;


    unrealized_pnl: number;
    realized_pnl: number;
    roi_percentage: number;


    liquidation_price: number;
    margin_ratio: number;


    status: 'open' | 'closed' | 'liquidated';
    opened_at: Date;
    closed_at?: Date;
}

export interface LiquidationEvent {
    positionId: string;
    userId: number;
    symbol: string;
    liquidation_price: number;
    margin_lost: number;
    timestamp: Date;
    reason: 'margin_call' | 'stop_loss' | 'take_profit';
}

export interface TradingEngineConfig {

    max_leverage: number;


    max_position_size: number;
    max_positions_per_user: number;
}

export type side = 'buy' | 'sell';


export interface LegacyOrder {
    orderId: number;
    userId: number;
    type: 'long' | 'short';
    asset: string;
    buy: number;
    margin: number;
    leverage: number;
    qty: number;
}