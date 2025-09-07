# Exness Trading Platform API Specification

## Overview

The Exness Trading Platform provides both REST API and WebSocket connections for trading operations, market data, and user management. The system consists of:

- **HTTP Server** (Port 3000): REST API endpoints
- **WebSocket Server** (Port 3492): Real-time data streaming
- **Price Poller**: Real-time price feeds from Binance
- **Trading Engine**: Order execution and position management

Base URL: `http://localhost:3000/api/v1`
WebSocket URL: `ws://localhost:3492`

---

## Authentication

Most endpoints require JWT authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

# REST API Endpoints

## 1. User Management

### POST /api/v1/order/signup
Create a new user account.

**Request Body:**
```json
{
  "username": "string (min 3 chars)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)"
}
```

**Response (200):**
```json
{
  "success": true,
  "userId": 2,
  "username": "john_doe",
  "message": "User created successfully"
}
```

**Response (411 - Validation Error):**
```json
{
  "message": "Incorrect inputs"
}
```

**Response (403 - User Exists):**
```json
{
  "message": "User already exists"
}
```

### POST /api/v1/order/signin
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 2,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Response (403):**
```json
{
  "message": "Incorrect credentials"
}
```

### GET /api/v1/order/balance
Get user's USD balance (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "usd_balance": 10000
}
```

---

## 2. Market Data

### GET /api/v1/assets
Get list of tradable assets.

**Response (200):**
```json
{
  "assets": [
    {
      "name": "Bitcoin",
      "symbol": "BTC",
      "buyPrice": 1002000000,
      "sellPrice": 1000000000,
      "decimals": 4,
      "imageUrl": "image_url"
    },
    {
      "name": "Solana",
      "symbol": "SOL",
      "buyPrice": 2100000,
      "sellPrice": 2000000,
      "decimals": 4,
      "imageUrl": "image_url"
    },
    {
      "name": "Ethereum",
      "symbol": "ETH",
      "buyPrice": 40200000,
      "sellPrice": 39800000,
      "decimals": 4,
      "imageUrl": "image_url"
    }
  ]
}
```

---

## 3. Trading Operations

### POST /api/v1/trading/orders
Place a new trading order.

**Request Body:**
```json
{
  "userId": 1,
  "symbol": "BTCUSDT",
  "side": "buy",
  "margin": 100.0,
  "leverage": 10,
  "type": "market",
  "limitPrice": 96500.00  // Optional for limit orders
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid-string",
    "userId": 1,
    "symbol": "BTCUSDT",
    "side": "buy",
    "leverage": 10,
    "margin": 100,
    "position_size": 1000,
    "entry_price": 96500.45,
    "status": "filled"
  },
  "message": "BUY order placed successfully"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Insufficient balance. Available: $500, Required: $1000"
}
```

### POST /api/v1/trading/trade
Legacy endpoint for placing orders (requires authentication middleware).

**Request Body:**
```json
{
  "asset": "btc",
  "type": "buy",
  "margin": 100.0,
  "leverage": 10
}
```

**Response (200):**
```json
{
  "success": true,
  "orderId": "uuid-string",
  "message": "BUY order placed successfully"
}
```

### GET /api/v1/trading/orders/:userId
Get all orders for a specific user.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "orderId": "uuid-string",
      "userId": 1,
      "symbol": "BTCUSDT",
      "side": "buy",
      "type": "market",
      "leverage": 10,
      "margin": 100,
      "position_size": 1000,
      "quantity": 0.01036,
      "entry_price": 96500.45,
      "status": "filled",
      "created_at": "2024-01-01T00:00:00.000Z",
      "filled_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /api/v1/trading/positions/:userId
Get all positions for a specific user.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "positionId": "uuid-string",
      "userId": 1,
      "symbol": "BTCUSDT",
      "side": "long",
      "leverage": 10,
      "margin": 100,
      "position_size": 1000,
      "quantity": 0.01036,
      "entry_price": 96500.45,
      "current_price": 96750.20,
      "unrealized_pnl": 2.59,
      "realized_pnl": 0,
      "roi_percentage": 2.59,
      "liquidation_price": 87650.41,
      "margin_ratio": 1.026,
      "status": "open",
      "opened_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "summary": {
    "total_positions": 1,
    "open_positions": 1,
    "total_unrealized_pnl": 2.59,
    "total_margin_used": 100
  }
}
```

### POST /api/v1/trading/positions/:positionId/close
Close a specific position.

**Request Body:**
```json
{
  "userId": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "positionId": "uuid-string",
    "status": "closed",
    "realized_pnl": 2.59,
    "closed_at": "2024-01-01T00:01:00.000Z"
  },
  "message": "Position closed successfully"
}
```

### GET /api/v1/trading/trades/open
Legacy endpoint - Get user's open positions (requires authentication middleware).

**Response (200):**
```json
{
  "success": true,
  "trades": [
    {
      "orderId": "position-uuid",
      "type": "buy",
      "asset": "BTCUSDT",
      "margin": 100,
      "leverage": 10,
      "openPrice": 96500.45,
      "currentPrice": 96750.20,
      "pnl": 2.59,
      "roi": 2.59
    }
  ]
}
```

### GET /api/v1/trading/trades
Legacy endpoint - Get all user's trades (requires authentication middleware).

**Response (200):**
```json
{
  "success": true,
  "trades": [
    {
      "orderId": "position-uuid",
      "type": "buy",
      "asset": "BTCUSDT",
      "margin": 100,
      "leverage": 10,
      "openPrice": 96500.45,
      "closePrice": 96750.20,
      "pnl": 2.59,
      "roi": 2.59,
      "status": "closed",
      "openedAt": "2024-01-01T00:00:00.000Z",
      "closedAt": "2024-01-01T00:01:00.000Z"
    }
  ]
}
```

---

## 4. Account Information

### GET /api/v1/trading/account/:userId
Get comprehensive account information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": 1,
      "username": "sayandeep",
      "balances": {
        "usd": {
          "total": 10000,
          "available": 8980,
          "margin_used": 1020
        }
      }
    },
    "account_metrics": {
      "equity": 10002.59,
      "balance": 10000,
      "free_margin": 8980,
      "margin_used": 1020,
      "margin_level": 980.45,
      "unrealized_pnl": 2.59
    },
    "positions": {
      "total": 1,
      "open": 1,
      "closed": 0,
      "liquidated": 0
    },
    "orders": {
      "total": 1
    }
  }
}
```

---

## 5. Risk Management

### GET /api/v1/trading/liquidations
Get liquidation events.

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `limit` (optional, default: 50): Number of records to return

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "positionId": "uuid-string",
      "userId": 1,
      "symbol": "BTCUSDT",
      "liquidation_price": 87500.00,
      "margin_lost": 95.50,
      "timestamp": "2024-01-01T00:02:00.000Z",
      "reason": "margin_call"
    }
  ],
  "count": 1
}
```

---

## 6. System Health

### GET /api/v1/trading/health
Check system health status.

**Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "trading_engine": "active",
    "price_feeds": "active",
    "price_symbols": 1,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

# WebSocket API

The WebSocket server provides real-time data streams for market prices, candles, positions, and orders.

**Connection URL:** `ws://localhost:3492`

## Message Format

All WebSocket messages use JSON format:

```json
{
  "action": "subscribe|unsubscribe",
  "symbol": "btcusdt",
  "interval": "1m",  // For candle subscriptions
  "type": "candles|positions|orders|prices",  
  "userId": 1  // Required for position/order subscriptions
}
```

## Subscription Types

### 1. Candle Data Subscription

**Subscribe to candle data:**
```json
{
  "action": "subscribe",
  "symbol": "btcusdt",
  "interval": "1m",
  "type": "candles"
}
```

**Candle Data Response:**
```json
{
  "type": "candle",
  "data": {
    "symbol": "BTCUSDT",
    "interval": "1m",
    "timestamp": 1704067200,
    "open": 96450.50,
    "high": 96780.30,
    "low": 96420.10,
    "close": 96500.45,
    "volume": 1250.75,
    "tradeCount": 1847
  }
}
```

**Supported Intervals:** `1m`, `5m`, `1h`, `1d`

### 2. Real-Time Price Updates

Price updates are automatically broadcast to all connected clients (no subscription needed):

**Price Update Response:**
```json
{
  "type": "price_update",
  "data": {
    "symbol": "BTCUSDT",
    "bid": 96450.45,
    "ask": 96550.45,
    "mid": 96500.45,
    "spread": 100,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Position Updates

**Subscribe to position updates:**
```json
{
  "action": "subscribe",
  "type": "positions",
  "userId": 1
}
```

**Position Update Response:**
```json
{
  "type": "position_update",
  "data": {
    "positionId": "uuid-string",
    "symbol": "BTCUSDT",
    "side": "long",
    "margin": 100,
    "current_price": 96750.20,
    "unrealized_pnl": 2.59,
    "roi_percentage": 2.59,
    "margin_ratio": 1.026,
    "status": "open"
  }
}
```

### 4. Order Updates

**Subscribe to order updates:**
```json
{
  "action": "subscribe",
  "type": "orders",
  "userId": 1
}
```

## WebSocket Connection Lifecycle

### Connection Established
```json
{
  "status": "connected",
  "message": "WebSocket connection established"
}
```

### Subscription Confirmation
```json
{
  "status": "subscribed",
  "symbol": "BTCUSDT",
  "interval": "1m",
  "type": "candles"
}
```

### Unsubscription Confirmation
```json
{
  "status": "unsubscribed",
  "symbol": "BTCUSDT",
  "interval": "1m",
  "type": "candles"
}
```

### Error Messages
```json
{
  "error": "Only BTCUSDT is supported currently"
}
```

```json
{
  "error": "Unsupported interval. Supported: 1m, 5m, 1h, 1d"
}
```

```json
{
  "error": "userId is required for position/order subscriptions"
}
```

---

# Data Models

## User
```typescript
interface User {
  userId: number;
  username: string;
  password: string;
  balances: {
    usd: {
      total: number;
      available: number;
      margin_used: number;
    };
  };
}
```

## Order
```typescript
interface Order {
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
  liquidation_price: number;
  status: 'pending' | 'filled' | 'cancelled' | 'liquidated';
  created_at: Date;
  filled_at?: Date;
  closed_at?: Date;
}
```

## Position
```typescript
interface Position {
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
```

## MarketPrice
```typescript
interface MarketPrice {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: Date;
}
```

## LiquidationEvent
```typescript
interface LiquidationEvent {
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

# Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created (successful order placement) |
| 400  | Bad Request (validation errors, insufficient balance) |
| 401  | Unauthorized (invalid/missing JWT token) |
| 403  | Forbidden (user exists, incorrect credentials) |
| 404  | Not Found (user/position not found) |
| 411  | Length Required (validation errors) |
| 500  | Internal Server Error |

---

# Rate Limits

- REST API: No explicit rate limiting implemented
- WebSocket: Connection limit based on server capacity
- Price Updates: Real-time streaming (no polling limits)

---

# Architecture Notes

## Data Flow
1. **Price Feed**: Binance WebSocket → Price Poller → Redis → Trading Engine & WebSocket Server
2. **Order Execution**: HTTP API → Redis Queue → Trading Engine
3. **Real-time Updates**: Trading Engine → WebSocket Server → Frontend

## Components
- **Price Poller** (`apps/price_poller`): Fetches real-time prices from Binance
- **Trading Engine** (`apps/engine`): Singleton pattern, handles order execution and position management  
- **HTTP Server** (`apps/http-server`): REST API endpoints
- **WebSocket Server** (`apps/websocket`): Real-time data streaming
- **Redis**: Message queuing and data persistence

## Security
- JWT authentication with configurable secret
- Input validation using Zod schemas
- CORS enabled for cross-origin requests

This API specification provides comprehensive documentation for integrating with the Exness Trading Platform.