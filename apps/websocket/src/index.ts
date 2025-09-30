import { WebSocketServer, WebSocket } from "ws";
import { CandleService, Candle } from "db";

interface Client {
    ws: WebSocket;
    subscriptions: Set<string>;
}

interface SubscriptionMessage {
    action: 'subscribe' | 'unsubscribe';
    symbol: string;
    interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
    from?: Date;
    to?: Date;
}

interface CandleMessage {
    type: 'candle';
    data: Candle;
    interval: string;
}

interface HistoricalCandlesMessage {
    type: 'historical';
    data: Candle[];
    interval: string;
}

class CandleWebSocketServer {
    private static instance: CandleWebSocketServer | null = null;
    private wss: WebSocketServer;
    private clients: Map<WebSocket, Client> = new Map();
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private lastCandleTimes: Map<string, Date> = new Map();
    private subscriptions: Map<string, Set<WebSocket>> = new Map();
    private port: number = 3005;

    private constructor() {
        this.wss = new WebSocketServer({ port: this.port });
        this.setupWebSocketServer();
    }

    public static getInstance(): CandleWebSocketServer {
        if (!CandleWebSocketServer.instance) {
            CandleWebSocketServer.instance = new CandleWebSocketServer();
        }
        return CandleWebSocketServer.instance;
    }

    private setupWebSocketServer(): void {
        this.wss.on('connection', (ws: WebSocket) => {

            const client: Client = {
                ws,
                subscriptions: new Set()
            };

            this.clients.set(ws, client);

            ws.on('message', (data: Buffer) => {
                try {
                    const message: SubscriptionMessage = JSON.parse(data.toString());
                    this.handleMessage(client, message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                    this.sendError(ws, 'Invalid message format');
                }
            });

            ws.on('close', () => {
                this.cleanupClient(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.cleanupClient(ws);
            });
        });
    }

    private cleanupClient(ws: WebSocket): void {
        const client = this.clients.get(ws);
        if (client) {
            client.subscriptions.forEach(subscriptionKey => {
                this.removeSubscription(ws, subscriptionKey);
            });
        }
        this.clients.delete(ws);
    }

    private async handleMessage(client: Client, message: SubscriptionMessage): Promise<void> {
        const { action, symbol, interval, from, to } = message;
        const subscriptionKey = `${symbol}-${interval}`;

        switch (action) {
            case 'subscribe':
                this.addSubscription(client.ws, subscriptionKey);
                client.subscriptions.add(subscriptionKey);

                if (from && to) {
                    await this.sendHistoricalCandles(client.ws, symbol, interval, new Date(from), new Date(to));
                }

                this.startCandleStream(subscriptionKey, symbol, interval);
                this.sendAck(client.ws, `Subscribed to ${subscriptionKey}`);
                break;

            case 'unsubscribe':
                this.removeSubscription(client.ws, subscriptionKey);
                client.subscriptions.delete(subscriptionKey);
                this.sendAck(client.ws, `Unsubscribed from ${subscriptionKey}`);
                break;

            default:
                this.sendError(client.ws, 'Invalid action');
        }
    }

    private addSubscription(ws: WebSocket, subscriptionKey: string): void {
        if (!this.subscriptions.has(subscriptionKey)) {
            this.subscriptions.set(subscriptionKey, new Set());
        }
        this.subscriptions.get(subscriptionKey)!.add(ws);
    }

    private removeSubscription(ws: WebSocket, subscriptionKey: string): void {
        const subscribers = this.subscriptions.get(subscriptionKey);
        if (subscribers) {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
                this.stopCandleStream(subscriptionKey);
                this.subscriptions.delete(subscriptionKey);
            }
        }
    }

    private async sendHistoricalCandles(ws: WebSocket, symbol: string, interval: string, from: Date, to: Date): Promise<void> {
        try {
            let candles: Candle[] = [];

            switch (interval) {
                case '1m':
                    candles = await CandleService.get1MinCandles(symbol, from, to);
                    break;
                case '5m':
                    candles = await CandleService.get5MinCandles(symbol, from, to);
                    break;
                case '15m':
                    candles = await CandleService.get15MinCandles(symbol, from, to);
                    break;
                case '1h':
                    candles = await CandleService.get1HrCandles(symbol, from, to);
                    break;
                case '4h':
                    candles = await CandleService.get4HrCandles(symbol, from, to);
                    break;
                case '1d':
                    candles = await CandleService.get1DayCandles(symbol, from, to);
                    break;
            }

            const historicalMessage: HistoricalCandlesMessage = {
                type: 'historical',
                data: candles,
                interval
            };

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(historicalMessage));
            }
        } catch (error) {
            console.error(`Error fetching historical ${interval} candles for ${symbol}:`, error);
            console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
            this.sendError(ws, 'Failed to fetch historical candles');
        }
    }

    private startCandleStream(subscriptionKey: string, symbol: string, interval: string): void {
        if (this.intervals.has(subscriptionKey)) {
            return;
        }

        const intervalMs = this.getIntervalMs(interval);

        const intervalId = setInterval(async () => {
            try {
                const now = new Date();
                const lastTime = this.lastCandleTimes.get(subscriptionKey);
                const from = lastTime || new Date(now.getTime() - intervalMs);

                let candles: Candle[] = [];

                switch (interval) {
                    case '1m':
                        candles = await CandleService.get1MinCandles(symbol, from, now);
                        break;
                    case '5m':
                        candles = await CandleService.get5MinCandles(symbol, from, now);
                        break;
                    case '15m':
                        candles = await CandleService.get15MinCandles(symbol, from, now);
                        break;
                    case '1h':
                        candles = await CandleService.get1HrCandles(symbol, from, now);
                        break;
                    case '4h':
                        candles = await CandleService.get4HrCandles(symbol, from, now);
                        break;
                    case '1d':
                        candles = await CandleService.get1DayCandles(symbol, from, now);
                        break;
                }

                const newCandles = candles.filter(candle => {
                    if (lastTime) {
                        return candle.timestamp > lastTime;
                    }
                    return true;
                });

                if (newCandles.length > 0) {
                    newCandles.forEach(candle => {
                        this.broadcastCandle(subscriptionKey, candle, interval);
                    });

                    const latestCandle = newCandles[newCandles.length - 1];
                    this.lastCandleTimes.set(subscriptionKey, latestCandle.timestamp);
                }
            } catch (error) {
                console.error(`Error fetching candles for ${subscriptionKey}:`, error);
            }
        }, intervalMs);

        this.intervals.set(subscriptionKey, intervalId);
    }

    private stopCandleStream(subscriptionKey: string): void {
        const intervalId = this.intervals.get(subscriptionKey);
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete(subscriptionKey);
            this.lastCandleTimes.delete(subscriptionKey);
        }
    }

    private broadcastCandle(subscriptionKey: string, candle: Candle, interval: string): void {
        const message: CandleMessage = {
            type: 'candle',
            data: candle,
            interval
        };

        const subscribers = this.subscriptions.get(subscriptionKey);
        if (subscribers) {
            subscribers.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(message));
                }
            });
        }
    }

    private sendAck(ws: WebSocket, message: string): void {
        ws.send(JSON.stringify({ type: 'ack', message }));
    }

    private sendError(ws: WebSocket, error: string): void {
        ws.send(JSON.stringify({ type: 'error', message: error }));
    }

    private getIntervalMs(interval: string): number {
        switch (interval) {
            case '1m': return 60 * 1000;
            case '5m': return 5 * 60 * 1000;
            case '15m': return 15 * 60 * 1000;
            case '1h': return 60 * 60 * 1000;
            case '4h': return 4 * 60 * 60 * 1000;
            case '1d': return 24 * 60 * 60 * 1000;
            default: return 60 * 1000;
        }
    }

    public close(): void {
        this.intervals.forEach((intervalId) => {
            clearInterval(intervalId);
        });
        this.intervals.clear();
        this.lastCandleTimes.clear();
        this.subscriptions.clear();
        this.wss.close();
        CandleWebSocketServer.instance = null;
    }
}

const server = CandleWebSocketServer.getInstance();

process.on('SIGINT', () => {
    server.close();
    process.exit(0);
});