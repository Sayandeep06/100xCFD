import { useEffect, useState, useCallback } from 'react';

interface Candle {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
}

interface WebSocketMessage {
  type: 'candle' | 'historical' | 'ack' | 'error';
  data?: Candle | Candle[];
  interval?: string;
  message?: string;
}

interface TradeRequest {
  asset: string;
  type: 'buy' | 'sell';
  margin: number;
  leverage: number;
}

interface TradeResponse {
  success: boolean;
  positionId?: string;
  orderId?: string;
  message: string;
}

export const useActualBackend = (interval: string = '1m') => {
  const [candleData, setCandleData] = useState<Candle[]>([]);
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({});
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection for candle data (port 3005)
  const connectCandleWebSocket = useCallback(() => {
    try {
      setError(null);
      const ws = new WebSocket('ws://localhost:3005');

      ws.onopen = () => {
        console.log('Connected to candle WebSocket server');
        setIsConnected(true);
        setError(null);

        // Subscribe to BTCUSDT candles with specified interval
        const subscribeMessage = {
          action: 'subscribe',
          symbol: 'BTCUSDT',
          interval: interval
        };
        console.log('Sending subscription:', subscribeMessage);
        ws.send(JSON.stringify(subscribeMessage));

        // Request some historical data (adjust time range based on interval)
        const now = new Date();
        let timeRange = 60 * 60 * 1000; // 1 hour default

        switch (interval) {
          case '1m':
          case '5m':
            timeRange = 60 * 60 * 1000; // 1 hour
            break;
          case '15m':
            timeRange = 6 * 60 * 60 * 1000; // 6 hours
            break;
          case '1h':
            timeRange = 24 * 60 * 60 * 1000; // 24 hours
            break;
          case '4h':
            timeRange = 7 * 24 * 60 * 60 * 1000; // 7 days
            break;
          case '1d':
            timeRange = 30 * 24 * 60 * 60 * 1000; // 30 days
            break;
        }

        const from = new Date(now.getTime() - timeRange);

        const historicalMessage = {
          action: 'subscribe',
          symbol: 'BTCUSDT',
          interval: interval,
          from: from.toISOString(),
          to: now.toISOString()
        };
        console.log('Requesting historical data:', historicalMessage);
        ws.send(JSON.stringify(historicalMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('Received WebSocket message:', message);

          switch (message.type) {
            case 'candle':
              if (message.data && !Array.isArray(message.data)) {
                const candle = message.data as Candle;
                setCandleData(prev => {
                  // Update or add the candle
                  const existing = prev.findIndex(c =>
                    Math.abs(new Date(c.timestamp).getTime() - new Date(candle.timestamp).getTime()) < 30000
                  );

                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = candle;
                    return updated;
                  } else {
                    return [...prev, candle].slice(-200); // Keep last 200 candles
                  }
                });

                // Update price data from latest candle
                setPriceData(prev => ({
                  ...prev,
                  [candle.symbol]: {
                    symbol: candle.symbol,
                    price: candle.close,
                    change: 0, // We'll calculate this
                    changePercent: 0,
                    volume: candle.volume,
                    high24h: candle.high,
                    low24h: candle.low,
                  }
                }));
              }
              break;

            case 'historical':
              if (message.data && Array.isArray(message.data)) {
                const candles = message.data as Candle[];
                setCandleData(candles);

                // Calculate price change from historical data
                if (candles.length >= 2) {
                  const latest = candles[candles.length - 1];
                  const previous = candles[candles.length - 2];
                  const change = latest.close - previous.close;
                  const changePercent = (change / previous.close) * 100;

                  // Calculate 24h high/low
                  const high24h = Math.max(...candles.map(c => c.high));
                  const low24h = Math.min(...candles.map(c => c.low));
                  const volume24h = candles.reduce((sum, c) => sum + c.volume, 0);

                  setPriceData(prev => ({
                    ...prev,
                    [latest.symbol]: {
                      symbol: latest.symbol,
                      price: latest.close,
                      change,
                      changePercent,
                      volume: volume24h,
                      high24h,
                      low24h,
                    }
                  }));
                }
              }
              break;

            case 'ack':
              console.log('WebSocket ACK:', message.message);
              break;

            case 'error':
              console.error('WebSocket error:', message.message);
              setError(message.message || 'WebSocket error');
              break;

            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setError('Failed to parse message from server');
        }
      };

      ws.onclose = (event) => {
        console.log('Candle WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setWebsocket(null);

        // Attempt to reconnect after 3 seconds unless it was a manual close
        if (event.code !== 1000) {
          setTimeout(() => {
            connectCandleWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('Candle WebSocket error:', error);
        setError('WebSocket connection failed');
        setIsConnected(false);
      };

      setWebsocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to connect to candle server');
      setIsConnected(false);
    }
  }, [interval]);

  // HTTP API call for placing trades (port 8080)
  const placeTrade = useCallback(async (trade: TradeRequest): Promise<TradeResponse> => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/trades/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trade)
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          positionId: data.positionId,
          orderId: data.orderId,
          message: data.message
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to place trade'
        };
      }
    } catch (error) {
      console.error('Error placing trade:', error);
      return {
        success: false,
        message: 'Network error: Could not connect to trading server'
      };
    }
  }, []);

  // Redis price polling (would need a separate endpoint)
  const pollRedisPrice = useCallback(async () => {
    try {
      // This would need to be implemented as an HTTP endpoint
      // that reads from the Redis 'priceToFE' queue
      const response = await fetch('http://localhost:8080/api/v1/prices/price/latest');
      if (response.ok) {
        const data = await response.json();
        // Update price data
        setPriceData(prev => ({
          ...prev,
          BTCUSDT: {
            ...prev.BTCUSDT,
            price: parseFloat(data.price)
          }
        }));
      }
    } catch (error) {
      console.error('Error polling Redis price:', error);
    }
  }, []);

  // Initialize connection
  useEffect(() => {
    connectCandleWebSocket();

    // Poll Redis prices every second (if endpoint exists)
    const priceInterval = setInterval(pollRedisPrice, 1000);

    return () => {
      if (websocket) {
        websocket.close(1000, 'Component unmounting');
      }
      clearInterval(priceInterval);
    };
  }, [connectCandleWebSocket, pollRedisPrice]);

  // Manually reconnect
  const reconnect = useCallback(() => {
    if (websocket) {
      websocket.close();
    }
    connectCandleWebSocket();
  }, [websocket, connectCandleWebSocket]);

  return {
    candleData,
    priceData,
    isConnected,
    error,
    placeTrade,
    reconnect,
  };
};