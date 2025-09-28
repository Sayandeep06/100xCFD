import { useEffect, useState, useCallback } from 'react';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface WebSocketMessage {
  type: 'price' | 'candle' | 'error' | 'connected';
  symbol?: string;
  data?: any;
  [key: string]: any;
}

export const useRedisData = (symbols: string[], wsUrl?: string) => {
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({});
  const [candleData, setCandleData] = useState<Record<string, CandleData[]>>({});
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default WebSocket URL - adjust based on your backend
  const defaultWsUrl = wsUrl || 'ws://localhost:8080/ws';

  const connectWebSocket = useCallback(() => {
    try {
      setError(null);
      const ws = new WebSocket(defaultWsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected to Redis stream');
        setIsConnected(true);
        setError(null);

        // Subscribe to price feeds for all symbols
        ws.send(JSON.stringify({
          action: 'subscribe',
          type: 'prices',
          symbols: symbols
        }));

        // Subscribe to candle data
        symbols.forEach(symbol => {
          ws.send(JSON.stringify({
            action: 'subscribe',
            type: 'candles',
            symbol: symbol,
            interval: '1m'
          }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'price':
              if (message.symbol && message.data) {
                setPriceData(prev => ({
                  ...prev,
                  [message.symbol!]: {
                    symbol: message.symbol!,
                    price: message.data.price || 0,
                    change: message.data.change || 0,
                    changePercent: message.data.changePercent || 0,
                    volume: message.data.volume || 0,
                    high24h: message.data.high24h || 0,
                    low24h: message.data.low24h || 0,
                  }
                }));
              }
              break;

            case 'candle':
              if (message.symbol && message.data) {
                const newCandle: CandleData = {
                  time: message.data.time || Date.now(),
                  open: message.data.open || 0,
                  high: message.data.high || 0,
                  low: message.data.low || 0,
                  close: message.data.close || 0,
                  volume: message.data.volume || 0,
                };

                setCandleData(prev => {
                  const existing = prev[message.symbol!] || [];

                  // Check if this is an update to the last candle or a new one
                  const lastCandle = existing[existing.length - 1];
                  if (lastCandle && Math.abs(lastCandle.time - newCandle.time) < 30000) {
                    // Update existing candle
                    const updated = [...existing];
                    updated[updated.length - 1] = newCandle;
                    return { ...prev, [message.symbol!]: updated };
                  } else {
                    // Add new candle, keep only last 200 candles
                    const updated = [...existing, newCandle].slice(-200);
                    return { ...prev, [message.symbol!]: updated };
                  }
                });
              }
              break;

            case 'error':
              console.error('WebSocket error:', message.data);
              setError(message.data?.message || 'Unknown error');
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
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setWebsocket(null);

        // Attempt to reconnect after 3 seconds unless it was a manual close
        if (event.code !== 1000) {
          setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection failed');
        setIsConnected(false);
      };

      setWebsocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to connect to server');
      setIsConnected(false);
    }
  }, [defaultWsUrl, symbols]);

  // Send trading orders
  const sendOrder = useCallback((order: {
    action: 'buy' | 'sell';
    symbol: string;
    size: number;
    type: 'market' | 'limit';
    price?: number;
    leverage?: number;
  }) => {
    if (websocket && isConnected) {
      websocket.send(JSON.stringify({
        action: 'place_order',
        orderAction: order.action,
        symbol: order.symbol,
        size: order.size,
        orderType: order.type,
        price: order.price,
        leverage: order.leverage
      }));
      return true;
    }
    return false;
  }, [websocket, isConnected]);

  // Get historical data
  const getHistoricalData = useCallback(async (
    symbol: string,
    interval: string = '1m',
    limit: number = 100
  ): Promise<CandleData[]> => {
    try {
      // This would typically be an HTTP request to your backend
      const response = await fetch(`/api/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        return data.map((candle: any) => ({
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    }
    return [];
  }, []);

  // Initialize connection
  useEffect(() => {
    if (symbols.length > 0) {
      connectWebSocket();
    }

    return () => {
      if (websocket) {
        websocket.close(1000, 'Component unmounting');
      }
    };
  }, [connectWebSocket, symbols.length]);

  // Manually reconnect
  const reconnect = useCallback(() => {
    if (websocket) {
      websocket.close();
    }
    connectWebSocket();
  }, [websocket, connectWebSocket]);

  return {
    priceData,
    candleData,
    isConnected,
    error,
    sendOrder,
    getHistoricalData,
    reconnect,
  };
};