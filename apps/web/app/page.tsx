"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useActualBackend } from './hooks/useActualBackend';
import { AuthModal } from './components/AuthModal';
import styles from './page.module.css';

// Types for our data structures
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

interface Position {
  positionId: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  opened_at: string;
  margin: number;
  leverage: number;
  position_size: number;
  status: string;
}

interface User {
  userId: number;
  username: string;
  balance: number;
}

export default function TradingPlatform() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  // Only BTCUSDT is available in the actual backend
  const symbols = ['BTCUSDT'];

  // State management
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [positions, setPositions] = useState<Position[]>([]);
  const [marginAmount, setMarginAmount] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(1);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Always use real backend with selected timeframe
  const { priceData, candleData, isConnected, error, placeTrade } = useActualBackend(selectedTimeframe);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff88',
      downColor: '#ff4444',
      borderDownColor: '#ff4444',
      borderUpColor: '#00ff88',
      wickDownColor: '#ff4444',
      wickUpColor: '#00ff88',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
    };
  }, []);

  // Update chart data when candleData changes
  useEffect(() => {
    if (candlestickSeriesRef.current && volumeSeriesRef.current && candleData.length > 0) {
      const formattedCandleData = candleData.map(candle => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000), // Real data: timestamp is Date
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      const formattedVolumeData = candleData.map(candle => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
        value: candle.volume,
        color: candle.close >= candle.open ? '#00ff8840' : '#ff444440',
      }));

      candlestickSeriesRef.current.setData(formattedCandleData);
      volumeSeriesRef.current.setData(formattedVolumeData);
    }
  }, [candleData, selectedSymbol, selectedTimeframe]);

  // Fetch positions from backend
  const fetchPositions = async () => {
    if (!user) return;

    try {
      const response = await fetch(`http://localhost:8080/api/v1/trades/positions/${user.userId}`);
      const data = await response.json();

      if (data.success) {
        setPositions(data.positions);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  // Load positions when user logs in
  useEffect(() => {
    if (user) {
      fetchPositions();
      // Refresh positions every 5 seconds
      const interval = setInterval(fetchPositions, 5000);
      return () => clearInterval(interval);
    } else {
      setPositions([]);
    }
  }, [user]);

  // Trading functions
  const executeTrade = async (type: 'long' | 'short') => {
    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const currentPrice = priceData[selectedSymbol]?.price || 0;
    if (!currentPrice) {
      alert('Price data not available');
      return;
    }

    // Check if user has sufficient balance
    if (user.balance < marginAmount) {
      alert(`Insufficient balance. Required: $${marginAmount.toFixed(2)}, Available: $${user.balance.toFixed(2)}`);
      return;
    }

    // Calculate position size and quantity based on margin and leverage
    const positionSize = marginAmount * leverage;
    const quantity = positionSize / currentPrice;

    // Send order to backend with authentication
    try {
      const response = await fetch('http://localhost:8080/api/v1/trades/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId,
          asset: selectedSymbol,
          type: type === 'long' ? 'buy' : 'sell',
          margin: marginAmount,
          leverage: leverage
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Trade placed successfully:', result.message);
        // Update user balance
        setUser(prev => prev ? { ...prev, balance: prev.balance - marginAmount } : null);
        // Refresh positions
        fetchPositions();
      } else {
        console.error('Trade failed:', result.message);
        alert(`Trade failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error placing trade:', error);
      alert('Failed to place trade. Please try again.');
    }
  };

  const closePosition = async (positionId: string) => {
    if (!user) return;

    try {
      const response = await fetch('http://localhost:8080/api/v1/trades/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId,
          positionId: positionId
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Position closed successfully');
        // Refresh positions and user balance
        fetchPositions();
        // TODO: Update user balance with the closed position PnL
      } else {
        console.error('Failed to close position:', result.message);
        alert(`Failed to close position: ${result.message}`);
      }
    } catch (error) {
      console.error('Error closing position:', error);
      alert('Failed to close position. Please try again.');
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('tradingUser', JSON.stringify(userData));
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('tradingUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('tradingUser');
      }
    }
  }, []);

  return (
    <div className={styles.tradingPlatform}>
      {/* Header with price ticker */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>TradingPlatform</h1>
          <div className={styles.connectionStatus}>
            <span className={`${styles.status} ${isConnected ? styles.connected : styles.disconnected}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            {error && <span className={styles.error}>⚠️ {error}</span>}
          </div>
        </div>

        <div className={styles.userSection}>
          {user ? (
            <div className={styles.userInfo}>
              <span className={styles.username}>👤 {user.username}</span>
              <span className={styles.balance}>💰 ${user.balance.toFixed(2)}</span>
              <button
                className={styles.logoutButton}
                onClick={() => {
                  setUser(null);
                  localStorage.removeItem('tradingUser');
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              className={styles.loginButton}
              onClick={() => setShowAuthModal(true)}
            >
              Login / Sign Up
            </button>
          )}
        </div>
        <div className={styles.priceTicker}>
          {symbols.map(symbol => {
            const price = priceData[symbol];
            return (
              <div
                key={symbol}
                className={`${styles.tickerItem} ${selectedSymbol === symbol ? styles.active : ''}`}
                onClick={() => setSelectedSymbol(symbol)}
              >
                <span className={styles.symbol}>{symbol}</span>
                <span className={styles.price}>
                  ${price?.price?.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }) || '---'}
                </span>
                <span className={`${styles.change} ${(price?.change || 0) >= 0 ? styles.positive : styles.negative}`}>
                  {(price?.changePercent || 0) >= 0 ? '+' : ''}{(price?.changePercent || 0).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </header>

      <div className={styles.mainContent}>
        {/* Left panel - Chart */}
        <div className={styles.chartPanel}>
          <div className={styles.chartHeader}>
            <h2>{selectedSymbol}</h2>
            <div className={styles.chartControls}>
              <button
                className={selectedTimeframe === '1m' ? styles.active : ''}
                onClick={() => setSelectedTimeframe('1m')}
              >
                1m
              </button>
              <button
                className={selectedTimeframe === '5m' ? styles.active : ''}
                onClick={() => setSelectedTimeframe('5m')}
              >
                5m
              </button>
              <button
                className={selectedTimeframe === '15m' ? styles.active : ''}
                onClick={() => setSelectedTimeframe('15m')}
              >
                15m
              </button>
              <button
                className={selectedTimeframe === '1h' ? styles.active : ''}
                onClick={() => setSelectedTimeframe('1h')}
              >
                1h
              </button>
              <button
                className={selectedTimeframe === '4h' ? styles.active : ''}
                onClick={() => setSelectedTimeframe('4h')}
              >
                4h
              </button>
              <button
                className={selectedTimeframe === '1d' ? styles.active : ''}
                onClick={() => setSelectedTimeframe('1d')}
              >
                1d
              </button>
            </div>
          </div>
          <div ref={chartContainerRef} className={styles.chartContainer} />
        </div>

        {/* Right panel - Trading */}
        <div className={styles.tradingPanel}>
          {/* Order form */}
          <div className={styles.orderForm}>
            <h3>Place Order</h3>
            <div className={styles.formGroup}>
              <label>Symbol</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
              >
                {symbols.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Margin (USD)</label>
              <input
                type="number"
                value={marginAmount}
                onChange={(e) => setMarginAmount(Number(e.target.value))}
                step="1"
                min="1"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Leverage</label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
                <option value={20}>20x</option>
                <option value={50}>50x</option>
                <option value={100}>100x</option>
              </select>
            </div>

            <div className={styles.currentPrice}>
              <span>Market Price: ${priceData[selectedSymbol]?.price?.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) || '---'}</span>
            </div>

            <div className={styles.tradeDetails}>
              <div>Margin: ${marginAmount.toFixed(2)}</div>
              <div>Position Size: ${(marginAmount * leverage).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</div>
              <div>Quantity: {priceData[selectedSymbol]?.price
                ? ((marginAmount * leverage) / priceData[selectedSymbol].price).toFixed(6)
                : '---'} {selectedSymbol.replace('USDT', '')}
              </div>
            </div>

            <div className={styles.tradeButtons}>
              <button
                className={`${styles.tradeButton} ${styles.longButton}`}
                onClick={() => executeTrade('long')}
              >
                Long / Buy
              </button>
              <button
                className={`${styles.tradeButton} ${styles.shortButton}`}
                onClick={() => executeTrade('short')}
              >
                Short / Sell
              </button>
            </div>
          </div>

          {/* Positions */}
          <div className={styles.positionsPanel}>
            <h3>Open Positions</h3>
            {positions.length === 0 ? (
              <p>No open positions</p>
            ) : (
              <div className={styles.positionsList}>
                {positions.map(position => (
                  <div key={position.positionId} className={styles.positionItem}>
                    <div className={styles.positionHeader}>
                      <span className={styles.positionSymbol}>{position.symbol}</span>
                      <span className={`${styles.positionType} ${position.side === 'long' ? styles.long : styles.short}`}>
                        {position.side.toUpperCase()}
                      </span>
                      <button
                        className={styles.closeButton}
                        onClick={() => closePosition(position.positionId)}
                      >
                        ×
                      </button>
                    </div>
                    <div className={styles.positionDetails}>
                      <div>Quantity: {position.quantity.toFixed(6)} {position.symbol.replace('USDT', '')}</div>
                      <div>Margin: ${position.margin.toFixed(2)}</div>
                      <div>Leverage: {position.leverage}x</div>
                      <div>Entry: ${position.entry_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div>Current: ${position.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className={`${styles.pnl} ${position.unrealized_pnl >= 0 ? styles.positive : styles.negative}`}>
                        PnL: {position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}