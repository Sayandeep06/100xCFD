import { useEffect, useState } from 'react';

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

// Mock price data for demonstration
const initialPrices: Record<string, PriceData> = {
  'BTCUSDT': {
    symbol: 'BTCUSDT',
    price: 42350.50,
    change: 1250.30,
    changePercent: 3.04,
    volume: 28543.25,
    high24h: 43100.00,
    low24h: 40800.00,
  },
  'ETHUSDT': {
    symbol: 'ETHUSDT',
    price: 2845.75,
    change: -125.30,
    changePercent: -4.22,
    volume: 156789.50,
    high24h: 2950.00,
    low24h: 2780.00,
  },
  'ADAUSDT': {
    symbol: 'ADAUSDT',
    price: 0.4567,
    change: 0.0234,
    changePercent: 5.41,
    volume: 245678.90,
    high24h: 0.4650,
    low24h: 0.4200,
  },
  'SOLUSDT': {
    symbol: 'SOLUSDT',
    price: 98.45,
    change: 7.23,
    changePercent: 7.92,
    volume: 45678.12,
    high24h: 102.30,
    low24h: 88.50,
  },
  'DOTUSDT': {
    symbol: 'DOTUSDT',
    price: 6.78,
    change: -0.45,
    changePercent: -6.22,
    volume: 123456.78,
    high24h: 7.25,
    low24h: 6.45,
  },
};

export const useMockPriceData = () => {
  const [priceData, setPriceData] = useState<Record<string, PriceData>>(initialPrices);
  const [candleData, setCandleData] = useState<CandleData[]>([]);

  useEffect(() => {
    // Generate initial candle data
    const generateCandleData = (basePrice: number, count: number): CandleData[] => {
      const candles: CandleData[] = [];
      let currentPrice = basePrice;
      const now = Date.now();

      for (let i = count; i >= 0; i--) {
        const volatility = 0.02; // 2% volatility
        const change = (Math.random() - 0.5) * currentPrice * volatility;

        const open = currentPrice;
        const close = currentPrice + change;
        const high = Math.max(open, close) + Math.random() * currentPrice * 0.01;
        const low = Math.min(open, close) - Math.random() * currentPrice * 0.01;

        candles.push({
          time: now - (i * 60000), // 1 minute intervals
          open,
          high,
          low,
          close,
          volume: Math.random() * 1000 + 100,
        });

        currentPrice = close;
      }

      return candles;
    };

    setCandleData(generateCandleData(42350, 100));

    // Simulate real-time price updates
    const priceUpdateInterval = setInterval(() => {
      setPriceData(prev => {
        const updated = { ...prev };

        Object.keys(updated).forEach(symbol => {
          const current = updated[symbol];
          if (!current) return;

          const volatility = 0.001; // 0.1% volatility per update
          const change = (Math.random() - 0.5) * current.price * volatility;
          const newPrice = current.price + change;
          const priceChange = newPrice - current.price;
          const changePercent = (priceChange / current.price) * 100;

          updated[symbol] = {
            symbol: current.symbol,
            price: newPrice,
            change: current.change + priceChange,
            changePercent: current.changePercent + changePercent,
            volume: current.volume + Math.random() * 10,
            high24h: current.high24h,
            low24h: current.low24h,
          };
        });

        return updated;
      });
    }, 1000); // Update every second

    // Simulate real-time candle updates
    const candleUpdateInterval = setInterval(() => {
      setCandleData(prev => {
        if (prev.length === 0) return prev;

        const lastCandle = prev[prev.length - 1];
        if (!lastCandle) return prev;

        const volatility = 0.005; // 0.5% volatility
        const change = (Math.random() - 0.5) * lastCandle.close * volatility;
        const newPrice = lastCandle.close + change;

        // Update the last candle or create a new one
        const timeDiff = Date.now() - lastCandle.time;

        if (timeDiff < 60000) {
          // Update current candle
          const updatedCandles = [...prev];
          const currentCandle = updatedCandles[updatedCandles.length - 1];
          if (!currentCandle) return prev;

          updatedCandles[updatedCandles.length - 1] = {
            time: currentCandle.time,
            open: currentCandle.open,
            close: newPrice,
            high: Math.max(currentCandle.high, newPrice),
            low: Math.min(currentCandle.low, newPrice),
            volume: currentCandle.volume + Math.random() * 10,
          };
          return updatedCandles;
        } else {
          // Create new candle
          const newCandle: CandleData = {
            time: Date.now(),
            open: lastCandle.close,
            high: Math.max(lastCandle.close, newPrice),
            low: Math.min(lastCandle.close, newPrice),
            close: newPrice,
            volume: Math.random() * 100 + 50,
          };

          // Keep only last 100 candles
          const updatedCandles = [...prev.slice(-99), newCandle];
          return updatedCandles;
        }
      });
    }, 2000); // Update every 2 seconds

    return () => {
      clearInterval(priceUpdateInterval);
      clearInterval(candleUpdateInterval);
    };
  }, []);

  return {
    priceData,
    candleData,
  };
};