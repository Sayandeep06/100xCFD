# Trading Platform - Unified Types Specification

This document contains all TypeScript interfaces and types used across the Exness Trading Platform. Use this as a reference to replicate the type system in other codebases.

---

## Core Trading Types

### User Interface

```typescript
export interface User {
    userId: number;
    username: string;
    password: string;
    balances: {
        usd: {
            total: number;          // Total balance including unrealized P&L
            available: number;      // Available balance for new trades
            margin_used: number;    // Balance locked in open positions
        };
    };
}
```

### Market Price Interface

```typescript
export interface MarketPrice {
    symbol: string;    // e.g., "BTCUSDT"
    bid: number;       // Bid price (sell price)
    ask: number;       // Ask price (buy price)  
    spread: number;    // Difference between ask and bid
    timestamp: Date;   // Price update timestamp
}
```

### Order Interface

```typescript
export interface Order {
    orderId: string;
    userId: number;
    symbol: string;         // Trading pair (e.g., "BTCUSDT")
    side: 'buy' | 'sell';   // Order direction
    type: 'market' | 'limit';
    
    // Position sizing
    leverage: number;       // Leverage multiplier (e.g., 10 for 10x)
    margin: number;         // Margin amount in USD
    position_size: number;  // Total position value (margin * leverage)
    quantity: number;       // Asset quantity (position_size / entry_price)
    
    // Pricing
    entry_price: number;    // Filled price
    current_price?: number; // Current market price
    limit_price?: number;   // Limit price for limit orders
    
    // Risk management
    stop_loss?: number;     // Stop loss price
    take_profit?: number;   // Take profit price
    liquidation_price: number; // Automatic liquidation price
    
    // Status tracking
    status: 'pending' | 'filled' | 'cancelled' | 'liquidated';
    created_at: Date;
    filled_at?: Date;
    closed_at?: Date;
}
```

### Position Interface

```typescript
export interface Position {
    positionId: string;
    userId: number;
    symbol: string;
    side: 'long' | 'short';
    
    // Position sizing
    leverage: number;
    margin: number;
    position_size: number;
    quantity: number;
    entry_price: number;
    current_price: number;
    
    // P&L tracking
    unrealized_pnl: number;     // Current unrealized profit/loss
    realized_pnl: number;       // Realized P&L when closed
    roi_percentage: number;     // Return on investment percentage
    
    // Risk management
    liquidation_price: number;
    margin_ratio: number;       // Current margin health ratio
    
    // Status tracking
    status: 'open' | 'closed' | 'liquidated';
    opened_at: Date;
    closed_at?: Date;
}
```

### Liquidation Event Interface
```typescript
export interface LiquidationEvent {
    positionId: string;
    userId: number;
    symbol: string;
    liquidation_price: number;
    margin_lost: number;
    timestamp: Date;
    reason: 'margin_call' | 'stop_loss' | 'take_profit';
}
```

---

## Trading Engine Configuration

### Trading Engine Config Interface

```typescript
export interface TradingEngineConfig {
    // Leverage limits
    max_leverage: Record<string, number>;       // e.g., {'BTCUSDT': 100, 'ETHUSDT': 50}
    margin_call_ratio: number;                  // Margin call threshold (0.1 = 10%)
    liquidation_fee: number;                    // Liquidation fee percentage
    liquidation_buffer: number;                 // Buffer before liquidation trigger
    
    // Position limits
    max_position_size: number;                  // Maximum position size in USD
    max_positions_per_user: number;             // Maximum open positions per user
}
```

---

## Price Feed Types

### Trade Data from Price Poller

```typescript
export interface TradeData {
    symbol: string;
    trade_id: number;
    price: number;
    quantity: number;
    is_maker: boolean;
    event_time: Date;
    trade_time: Date;
}
```

### Binance WebSocket Event
```typescript
export interface BinanceTradeEvent {
    e: string;  // Event type
    E: number;  // Event time
    s: string;  // Symbol
    t: number;  // Trade ID
    p: string;  // Price
    q: string;  // Quantity
    b: number;  // Buyer order ID
    a: number;  // Seller order ID
    T: number;  // Trade time
    m: boolean; // Is buyer maker
    M: boolean; // Ignore
}
```

---

## API Request/Response Types

### Authentication Types
```typescript
export interface SignupRequest {
    username: string;
    email: string;
    password: string;
}

export interface SignupResponse {
    success: boolean;
    userId: number;
    username: string;
    message: string;
}

export interface SigninRequest {
    username: string;
    password: string;
}

export interface SigninResponse {
    success: boolean;
    token: string;
    user: {
        userId: number;
        username: string;
        email: string;
    };
}
```

### Trading Request Types
```typescript
export interface PlaceOrderRequest {
    userId: number;
    symbol: string;
    side: 'buy' | 'sell';
    margin: number;
    leverage: number;
    type?: 'market' | 'limit';
    limitPrice?: number;
}

export interface ClosePositionRequest {
    userId: number;
}

// Legacy order request format
export interface LegacyOrderRequest {
    asset: string;
    type: 'buy' | 'sell';
    margin: number;
    leverage: number;
}
```

### API Response Types
```typescript
export interface StandardResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PositionsResponse {
    success: boolean;
    data: Position[];
    summary: {
        total_positions: number;
        open_positions: number;
        total_unrealized_pnl: number;
        total_margin_used: number;
    };
}

export interface AccountResponse {
    success: boolean;
    data: {
        user: {
            userId: number;
            username: string;
            balances: User['balances'];
        };
        account_metrics: {
            equity: number;
            balance: number;
            free_margin: number;
            margin_used: number;
            margin_level: number;
            unrealized_pnl: number;
        };
        positions: {
            total: number;
            open: number;
            closed: number;
            liquidated: number;
        };
        orders: {
            total: number;
        };
    };
}
```

---

## WebSocket Types

### WebSocket Message Types
```typescript
export interface WebSocketMessage {
    action: 'subscribe' | 'unsubscribe';
    symbol: string;
    interval?: string;
    type?: 'candles' | 'positions' | 'orders' | 'prices';
    userId?: number;
}

export interface ClientSubscription {
    ws: WebSocket;
    symbol: string;
    interval: string;
    type: 'candles' | 'positions' | 'orders';
    userId?: number;
}
```

### WebSocket Response Types
```typescript
export interface CandleResponse {
    type: 'candle';
    data: {
        symbol: string;
        interval: string;
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        tradeCount: number;
    };
}

export interface PriceUpdateResponse {
    type: 'price_update';
    data: {
        symbol: string;
        bid: number;
        ask: number;
        mid: number;
        spread: number;
        timestamp: Date;
    };
}

export interface PositionUpdateResponse {
    type: 'position_update';
    data: {
        positionId: string;
        symbol: string;
        side: 'long' | 'short';
        margin: number;
        current_price: number;
        unrealized_pnl: number;
        roi_percentage: number;
        margin_ratio: number;
        status: string;
    };
}

export interface LiquidationResponse {
    type: 'liquidation';
    data: {
        positionId: string;
        symbol: string;
        liquidation_price: number;
        margin_lost: number;
        reason: string;
    };
}
```

---

## Candle/Chart Data Types

### Candle Interface
```typescript
export interface Candle {
    symbol: string;
    interval: string;
    bucket: Date;      // Time bucket for this candle
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    trade_count: number;
}
```

---

## Asset/Market Data Types

### Asset Interface
```typescript
export interface Asset {
    name: string;
    symbol: string;
    buyPrice: number;
    sellPrice: number;
    decimals: number;
    imageUrl: string;
}
```

---

## Utility Types

### Side Type
```typescript
export type Side = 'buy' | 'sell';
```

### Order Status Types
```typescript
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'liquidated';
export type PositionStatus = 'open' | 'closed' | 'liquidated';
export type LiquidationReason = 'margin_call' | 'stop_loss' | 'take_profit';
```

### WebSocket Subscription Types
```typescript
export type SubscriptionType = 'candles' | 'positions' | 'orders' | 'prices';
export type CandleInterval = '1m' | '5m' | '1h' | '1d';
```

---

## Redis Message Types

### Engine Action Types
```typescript
export interface EngineMessage {
    action: 'place_order' | 'get_positions' | 'get_orders' | 'close_position' | 'create_user' | 'get_account';
    data: any;
}

export interface EngineResponse {
    success: boolean;
    data?: any;
    error?: string;
}
```

---

## Legacy Types (for backward compatibility)

### Legacy Order Interface
```typescript
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
```

---

## Usage Examples

### Creating a New Order
```typescript
const order: Order = {
    orderId: uuidv4(),
    userId: 1,
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    leverage: 10,
    margin: 100,
    position_size: 1000,
    quantity: 0.01036,
    entry_price: 96500.45,
    liquidation_price: 87650.41,
    status: 'filled',
    created_at: new Date(),
    filled_at: new Date()
};
```

### WebSocket Subscription
```typescript
const subscriptionMessage: WebSocketMessage = {
    action: 'subscribe',
    symbol: 'btcusdt',
    interval: '1m',
    type: 'candles'
};
```

### API Response Handling
```typescript
const response: StandardResponse<Position[]> = {
    success: true,
    data: [/* positions array */],
    message: "Positions retrieved successfully"
};
```

---

## Type Guards

### Utility type guards for runtime type checking
```typescript
export function isOrder(obj: any): obj is Order {
    return obj && typeof obj.orderId === 'string' && typeof obj.userId === 'number';
}

export function isPosition(obj: any): obj is Position {
    return obj && typeof obj.positionId === 'string' && ['open', 'closed', 'liquidated'].includes(obj.status);
}

export function isMarketPrice(obj: any): obj is MarketPrice {
    return obj && typeof obj.symbol === 'string' && typeof obj.bid === 'number' && typeof obj.ask === 'number';
}
```

---

## Implementation Notes

1. **UUID Generation**: Use `uuid` library for generating unique IDs for orders and positions
2. **Date Handling**: All timestamps use JavaScript `Date` objects
3. **Decimal Precision**: Financial calculations should use libraries like `decimal.js` for precision
4. **Validation**: Use `zod` or similar for runtime type validation
5. **Serialization**: Ensure proper JSON serialization for WebSocket and Redis messages

This unified type system ensures type safety and consistency across all components of the trading platform.