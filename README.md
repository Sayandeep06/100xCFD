# 100xCFD


**Project Overview**

- **Name:** `100xCFD` — a consolidated, production-oriented CFD trading platform implemented as a TypeScript monorepo.
- **Purpose:** Provide low-latency market data ingestion, a server-side trading engine for order/position management, HTTP APIs for account and trade operations, real-time WebSocket streams, and a Next.js web client for traders.

**High-level Architecture**

- **Microservices / Apps (in `apps/`)**:
	- `engine` — core trading engine: order matching, position management, risk checks, and persistence hooks (Redis + `db`).
	- `http-server` — REST API + auth for user, asset and trade endpoints; integrates with `engine` and `db`.
	- `price-poller` — market data poller/connector that ingests price feeds and writes canonical price updates to Redis.
	- `websocket` — real-time push service for broadcasting trades, order updates and price ticks to connected clients.
	- `web` — Next.js client application (trading UI, charts, and auth flows).

- **Shared packages (in `packages/`)**:
	- `db` — Prisma-backed data layer and candle services used by server services.
	- `@repo/ui`, `eslint-config`, TypeScript configs — shared infra for frontend and CI.

- **Infrastructure**:
	- Redis: caching, pub/sub, and short-term state for low-latency flows.
	- Prisma / Postgres (via `packages/db`): durable storage for users, trades, positions, and candles.
	- Docker / `docker-compose.yml` for local integration and containerized deployments.

**Tech Stack**

- Language: TypeScript (Node.js >= 18)
- Monorepo tooling: `pnpm` + `turbo`
- Web: Next.js (React)
- Realtime: `ws` and Redis pub/sub
- DB: Prisma + `@prisma/client` (SQL backend expected in production)
- Cache: Redis

**Key Features**

- Deterministic trading engine capable of maintaining orders and positions.
- Real-time price ingestion and client broadcasts.
- REST API with authentication and user management.
````markdown
# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build
yarn dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build --filter=docs

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build --filter=docs
yarn exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev
yarn exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev --filter=web

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev --filter=web
yarn exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo login

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)

````

---

## Project deep dive — 100xCFD (code-backed)

Below is a detailed, code-backed summary of how the monorepo is organized and which technologies are used for each purpose. For each service I reference exact files and the important runtime contracts (Redis keys, WebSocket endpoints, Prisma models, message shapes).

### Summary (short)

- Root scripts: `pnpm` + `turbo` (see `package.json` in repo root).
- Primary runtime apps in `/apps`: `engine`, `http-server`, `price-poller`, `websocket`, `web`.
- Shared DB layer in `/packages/db` exposing `prisma`, `CandleService`, and a Redis poller.

---

### Service: `engine` (core trading engine)

- Entry: `apps/engine/src/index.ts` — initializes `TradingEngine` and `RedisManager` and starts two processors: order and user processing.
- Key classes/files:
	- `TradingEngine` — `apps/engine/src/TradingEngine.ts`:
		- Responsibilities: order placement, price polling, position updates, liquidation, user management and authentication wrappers.
		- Uses `bcryptjs` for password hashing and `db` (Prisma client + `CandleService`) for persistent operations.
		- Polls prices via `CandleService.getLatestBidPrice()` / `getLatestAskPrice()` and keeps an in-memory Map of `prices` for quick access.
		- Price polling interval: 1000ms (set in `updatePrice()`), with safeguards to avoid overlapping polls and to fallback to last-known prices on error.
		- Order lifecycle: validates user balance, leverage, position limits → creates `Position` via Prisma → returns a `Position` DTO.
		- Position updates use raw SQL via `prisma.$executeRaw` to recalc `unrealized_pnl`, `roi_percentage`, and `margin_ratio` for open positions (separate queries for longs and shorts).
		- Liquidation: finds positions with `margin_ratio <= 0.01` and calls `liquidatePosition()` which runs in a Prisma transaction to update user balances and mark the position `liquidated`.

- `RedisManager` — `apps/engine/src/RedisManager.ts`:
	- Connects two Redis clients (client + publisher) using `redis` v5 client.
	- Consumer loops:
		- Pops `Order` queue via `rPop('Order')` and processes orders by invoking `TradingEngine.placeOrder()`.
		- Pops `User` queue via `rPop('User')` to handle `create_user` and `authenticate_user` actions.
	- Response pattern: each request enqueued includes an `id`; after processing, engine publishes a JSON response to channel `id` (used by HTTP server to correlate replies).
	- Error handling: robust per-item try/catch with publisher fallback.

Key runtime contracts used by other services:
- Queue names (Redis lists): `Order`, `User`, `toDB` (used by `price-poller`), `priceToFE` (latest price pushed by `price-poller`).
- Pub/sub: engine publishes responses on dynamic single-use channels named as the generated `id`.

---

### Service: `http-server` (REST API + auth)

- Entry: `apps/http-server/src/index.ts` — sets up `express`, `cors` and mounts routers.
- Routes & behavior:
	- `POST /api/v1/user/signup` (`apps/http-server/src/routes/user.ts`): packs a `create_user` message and sends it to engine via RedisManager.publishAndSubscribe (creates an `id`, pushes to `User` list, subscribes to `id` channel for response). Response carries `{ success, data }`.
	- `POST /api/v1/user/signin`: authenticates using `TradingEngine.authenticateUser()` directly (no Redis round-trip) and returns a JWT signed with `JWT_SECRET` (default fallback `'your-secret-key'` in `middleware/auth.ts`).
	- `GET /api/v1/prices/price/latest` (`apps/http-server/src/routes/assets.ts`): fetches latest price from Redis list `priceToFE` using `lRange`.
	- `POST /api/v1/trades/trade` (`apps/http-server/src/routes/trades.ts`): requires `authMiddleware`, constructs an `place_order` message and uses Redis publish/subscribe pattern to enqueue the order in the `Order` list and wait for engine response.

- `RedisManager` (`apps/http-server/src/RedisManager.ts`):
	- Creates publisher + subscriber and exposes `publishAndSubscribe(message)` which:
		- Generates `id`, subscribes to that channel, pushes `{ id, message }` to `User` or `Order` list, and waits (timeout 10s) for a response published to the `id` channel.
	- Also exposes `getLatestPrice()` which reads `priceToFE`.

- Auth:
	- JWT-based; middleware in `apps/http-server/src/middleware/auth.ts` verifies the token and places `userId` on `req`.
	- `JWT_SECRET` is read from `process.env.JWT_SECRET` or falls back to `your-secret-key` (replace this for production).

---

### Service: `price-poller` (market data ingestion)

- Entry: `apps/price-poller/src/index.ts` — connects to Binance aggregate trade stream `wss://fstream.binance.com/ws/btcusdt@aggTrade` via `ws` (`ws` WebSocket client), parses incoming messages into `TradeData` and pushes:
	- `RedisManager.sendToDB(tradeData)` → `lPush('toDB', JSON.stringify(message))` (consumed by `packages/db` poller to persist trades via Prisma)
	- `RedisManager.sendPrice(price)` → `lPush('priceToFE', price)` (frontend polling & HTTP server read latest price)

- `RedisManager` (`apps/price-poller/src/RedisManager.ts`) uses `redis` clients (`createClient()`) and two methods: `sendToDB()` and `sendPrice()`.

---

### Service: `websocket` (candle/ws broadcaster)

- Entry: `apps/websocket/src/index.ts` — starts a `ws` server on port `3005` and exposes a subscription protocol.
- Protocol and responsibilities:
	- Clients send `{ action: 'subscribe'|'unsubscribe', symbol, interval, from?, to? }` to subscribe to a `symbol-interval` channel.
	- On subscribe, the server uses `CandleService` (from `/packages/db/candleService.ts`) to fetch historical candles for the requested range and streams incremental candles at the required interval.
	- Candle intervals supported: `1m, 5m, 15m, 1h, 4h, 1d`.
	- Broadcasting: server keeps per-subscription timers and sends messages of shape `{ type: 'candle', data: Candle, interval }` and historical responses `{ type: 'historical', data: Candle[] }`.

---

### Frontend: `web` (Next.js)

- Location: `apps/web/` (Next.js app using `app/` dir). Uses `lightweight-charts` for charting (`package.json` dependency).
- Hooks & behavior:
	- `useRedisData` and `useActualBackend` (in `apps/web/app/hooks/`) connect to backends via WebSocket and/or fetch endpoints:
		- `useActualBackend` connects to `ws://localhost:3005` for candle data, and to `http://localhost:8080/api/v1/trades/trade` and `/api/v1/prices/price/latest` for placing trades and polling latest price.
		- `useRedisData` demonstrates a different socket shape (`ws://localhost:8080/ws`) that the front-end expects in some setups (this repo includes two different WebSocket consumers — the candle server at `3005` and a generic WS endpoint that can be added to the HTTP server if desired).
	- The client keeps local transient state for candles and price ticks and reconciles them into chart datasets.

---

### Shared DB package: `packages/db`

- Exposes `prisma` client from `packages/db/index.ts` (Prisma client generated into `packages/db/generated/prisma`).
- `prisma` schema: `packages/db/prisma/schema.prisma` — models defined:
	- `trade` model: `{ id: uuid, symbol, price, quantity, trade_time }` with index on `[symbol, trade_time]`.
	- `User` model: `{ id: BigInt, username unique, password, available_usd, used_usd, positions[] }`.
	- `Position` model: `{ id: uuid, user_id, symbol, side, leverage, margin, position_size, quantity, entry_price, current_price, unrealized_pnl, realized_pnl, roi_percentage, liquidation_price, margin_ratio, status, opened_at, closed_at }` with several indexes to support queries by `user_id`, `symbol`, `status`, and `margin_ratio`.

- `CandleService` (`packages/db/candleService.ts`): aggregates trades into interval candles (1m, 5m, 15m, 1h, 4h, 1d) using `prisma.trade` queries. It exposes functions like `get1MinCandles`, `get5MinCandles`, etc., and `getLatestBidPrice` / `getLatestAskPrice` used by `TradingEngine` for mid-price calculation.

- `poller.ts` (`packages/db/poller.ts`) runs a Redis consumer for `toDB` list and writes incoming `TradeMessage` items into `prisma.trade`.

---

## Exact third-party libraries and purpose (from code)

- `redis` (node-redis v5): in `apps/engine`, `apps/http-server`, `apps/price-poller`, and `packages/db` for queues, pub/sub and short-lived state.
- `ws`: WebSocket client & server used in `apps/price-poller` and `apps/websocket`.
- `express` + `cors`: HTTP server in `apps/http-server`.
- `jsonwebtoken`: JWT auth in `apps/http-server` middleware.
- `bcryptjs`: password hashing in `apps/engine/TradingEngine.ts`.
- `prisma` + `@prisma/client`: typed DB client and schema (in `packages/db`).
- `lightweight-charts`: charting in the frontend `apps/web`.
- `next` / `react` / `react-dom`: Next.js frontend.
- `uuid` used in some packages for ids (dependency in `apps/engine/package.json`).

---

## Runtime contracts and Redis keys (important for integration tests)

- `Order` (Redis list): engine pops messages to process order placements. Enqueued object shape is pushed as `{ id, message }` where `message` is `JSON.stringify({ action: 'place_order', data: {...} })`.
- `User` (Redis list): used for `create_user` and `authenticate_user` requests via engine's queueing mechanism.
- `toDB` (Redis list): price-poller pushes `TradeData` items here for `packages/db/poller.ts` to persist.
- `priceToFE` (Redis list): price-poller pushes the latest price as a simple value; HTTP server reads it for `/api/v1/prices/price/latest`.
- Dynamic reply channels: engine publishes reply JSON on channels named by the `id` included in the request (used by `http-server` to correlate responses).

---

## Recommended immediate improvements (from code review)

- Replace default `JWT_SECRET` fallback in `apps/http-server/src/middleware/auth.ts` with a required environment variable and fail fast if missing.
- Add graceful shutdown and back-pressure to Redis consumer loops (they run tight while(true) loops; add `SIGINT` handlers and a cancellation token).
- Limit public origin `*` in CORS for production; restrict to known frontend origins.
- Add schema validation (e.g., `zod` or `ajv`) on incoming HTTP body data to avoid bad payloads reaching internal logic.
- Add unit tests for `TradingEngine` price and liquidation logic and integration tests covering the Redis request/response flow.

---

If you'd like, I will now:

- Add per-service `README.md` files that list exact environment variables and show sample requests and responses.
- Create a `./.env.example` containing `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and recommended production values.
- Add a small GitHub Actions CI snippet that installs dependencies, runs `pnpm run check-types`, lints, and runs tests + Prisma migrate steps.

Pick one and I'll implement it next.
