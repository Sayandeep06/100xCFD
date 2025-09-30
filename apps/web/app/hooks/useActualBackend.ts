import { useEffect, useState, useCallback, useRef } from 'react';

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
  const websocketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectCandleWebSocket = useCallback(() => {
    try {
      setError(null);

      if (websocketRef.current) {
        websocketRef.current.close(1000, 'Reconnecting');
        websocketRef.current = null;
      }

      const ws = new WebSocket('ws://localhost:3005');
      websocketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);

        const subscribeMessage = {
          action: 'subscribe',
          symbol: 'BTCUSDT',
          interval: interval
        };
        ws.send(JSON.stringify(subscribeMessage));

        const now = new Date();
        let timeRange = 60 * 60 * 1000; 

        switch (interval) {
          case '1m':
          case '5m':
            timeRange = 60 * 60 * 1000; 
            break;
          case '15m':
            timeRange = 6 * 60 * 60 * 1000; 
            break;
          case '1h':
            timeRange = 24 * 60 * 60 * 1000; 
            break;
          case '4h':
            timeRange = 7 * 24 * 60 * 60 * 1000; 
            break;
          case '1d':
            timeRange = 30 * 24 * 60 * 60 * 1000; 
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
        ws.send(JSON.stringify(historicalMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'candle':
              if (message.data && !Array.isArray(message.data)) {
                const candle = message.data as Candle;
                setCandleData(prev => {
                  const existing = prev.findIndex(c =>
                    Math.abs(new Date(c.timestamp).getTime() - new Date(candle.timestamp).getTime()) < 30000
                  );

                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = candle;
                    return updated;
                  } else {
                    return [...prev, candle].slice(-200); 
                  }
                });

                setPriceData(prev => ({
                  ...prev,
                  [candle.symbol]: {
                    symbol: candle.symbol,
                    price: candle.close,
                    change: 0, 
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

                if (candles.length >= 2) {
                  const latest = candles[candles.length - 1];
                  const previous = candles[candles.length - 2];
                  const change = latest.close - previous.close;
                  const changePercent = (change / previous.close) * 100;

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
              break;

            case 'error':
              console.error('WebSocket error:', message.message);
              setError(message.message || 'WebSocket error');
              break;

            default:
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setError('Failed to parse message from server');
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);

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
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to connect to candle server');
      setIsConnected(false);
    }
  }, [interval]);

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

  const pollRedisPrice = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/prices/price/latest');
      if (response.ok) {
        const data = await response.json();
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

  useEffect(() => {
    connectCandleWebSocket();

    const priceInterval = setInterval(pollRedisPrice, 1000);

    return () => {
      clearInterval(priceInterval);
      if (websocketRef.current) {
        websocketRef.current.close(1000, 'Component unmounting');
        websocketRef.current = null;
      }
    };
  }, [interval, connectCandleWebSocket, pollRedisPrice]);

  const reconnect = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    connectCandleWebSocket();
  }, [connectCandleWebSocket]);

  return {
    candleData,
    priceData,
    isConnected,
    error,
    placeTrade,
    reconnect,
  };
};