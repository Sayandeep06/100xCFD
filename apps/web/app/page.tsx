"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useActualBackend } from './hooks/useActualBackend';
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
  const [user, setUser] = useState<User>({
    userId: 1,
    username: "Sayandeep",
    balance: 20000
  });
  const [isOrderFormCollapsed, setIsOrderFormCollapsed] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  // Always use real backend with selected timeframe
  const { priceData, candleData, isConnected, error, placeTrade } = useActualBackend(selectedTimeframe);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#151b23' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { color: '#252d38' },
        horzLines: { color: '#252d38' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#252d38',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#252d38',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#6b7280',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle chart resize
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
      setTimeout(() => {
        chart.timeScale().fitContent();
      }, 0);
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
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
        color: candle.close >= candle.open ? '#10b98140' : '#ef444440',
      }));

      candlestickSeriesRef.current.setData(formattedCandleData);
      volumeSeriesRef.current.setData(formattedVolumeData);
    }
  }, [candleData, selectedSymbol, selectedTimeframe]);

  // Fetch positions from backend
  const fetchPositions = async () => {
    if (!user) return;

    try {
      console.log('Fetching positions for user:', user.userId);
      const response = await fetch(`http://localhost:8080/api/v1/trades/positions/${user.userId}`);
      const data = await response.json();
      console.log('Positions response:', data);

      if (data.success) {
        console.log('Setting positions:', data.positions);
        setPositions(data.positions);
      } else {
        console.warn('Failed to fetch positions:', data.message);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  // Fetch user data from backend
  const fetchUserData = async () => {
    try {
      console.log('Fetching user data for user:', user.userId);
      const response = await fetch(`http://localhost:8080/api/v1/user/data/${user.userId}`);
      const data = await response.json();
      console.log('User data response:', data);

      if (data.success) {
        console.log('Updating user balance from', user.balance, 'to', data.user.balance);
        setUser(prev => ({
          ...prev,
          balance: data.user.balance
        }));
      } else {
        console.warn('Failed to fetch user data:', data.message);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Load positions and user data
  useEffect(() => {
    fetchPositions();
    fetchUserData();
    // Refresh positions every 5 seconds
    const positionsInterval = setInterval(fetchPositions, 5000);
    // Refresh user data every 10 seconds
    const userDataInterval = setInterval(fetchUserData, 10000);
    return () => {
      clearInterval(positionsInterval);
      clearInterval(userDataInterval);
    };
  }, []);

  // Trading functions
  const executeTrade = async (type: 'long' | 'short') => {
    console.log('=== Order Placement Debug ===');
    console.log('isPlacingOrder:', isPlacingOrder);
    console.log('isConnected:', isConnected);
    console.log('priceData:', priceData);
    console.log('selectedSymbol:', selectedSymbol);

    // Prevent multiple concurrent orders
    if (isPlacingOrder) {
      console.log('Order already in progress, ignoring click');
      return;
    }

    const currentPrice = priceData[selectedSymbol]?.price || 0;
    console.log('Current price for', selectedSymbol, ':', currentPrice);

    // Simplified validation - just check if we have some price data
    if (!currentPrice || currentPrice <= 0) {
      console.warn('Price validation failed - price:', currentPrice);
      alert('Price data not available. Current price: ' + currentPrice);
      return;
    }

    setIsPlacingOrder(true);

    // Calculate position size and quantity based on margin and leverage
    const positionSize = marginAmount * leverage;
    const quantity = positionSize / currentPrice;

    // Send order to backend with authentication
    try {
      console.log('Placing order:', {
        userId: user.userId,
        asset: selectedSymbol,
        type: type === 'long' ? 'buy' : 'sell',
        margin: marginAmount,
        leverage: leverage
      });

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
      console.log('Order response:', result);

      if (result.success) {
        console.log('Trade placed successfully:', result.message);
        alert(`✅ Order placed successfully! ${result.message}`);
        // Add delay to allow backend to process the order
        setTimeout(() => {
          console.log('Refreshing positions and user data...');
          fetchPositions();
          fetchUserData();
        }, 1000);
      } else {
        console.error('Trade failed:', result.message);
        alert(`Trade failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error placing trade:', error);
      alert('Failed to place trade. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const closePosition = async (positionId: string) => {

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
        // Refresh positions and user data
        fetchPositions();
        fetchUserData();
      } else {
        console.error('Failed to close position:', result.message);
        alert(`Failed to close position: ${result.message}`);
      }
    } catch (error) {
      console.error('Error closing position:', error);
      alert('Failed to close position. Please try again.');
    }
  };


  return (
    <div className={styles.tradingPlatform}>
      {/* Header with price ticker */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>100xCFD</h1>
        </div>

        <div className={styles.connectionStatus}>
          <span className={`${styles.status} ${isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected ? '● Connected' : '● Disconnected'}
          </span>
          {error && <span className={styles.error}>⚠ {error}</span>}
        </div>

        <div className={styles.centerSection}>
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
        </div>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <span className={styles.username}>{user.username}</span>
            <span className={styles.balance}>${user.balance.toFixed(2)}</span>
          </div>
          <button className={styles.logoutButton}>
            Logout
          </button>
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
            <div
              className={styles.orderFormHeader}
              onClick={() => setIsOrderFormCollapsed(!isOrderFormCollapsed)}
            >
              <h3>Place Order</h3>
              <span className={`${styles.expandIcon} ${isOrderFormCollapsed ? styles.collapsed : ''}`}>
                ▼
              </span>
            </div>
            <div className={`${styles.orderFormContent} ${isOrderFormCollapsed ? styles.collapsed : ''}`}>
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
                <option value={200}>200x</option>
                <option value={500}>500x</option>
                <option value={1000}>1,000x</option>
                <option value={5000}>5,000x</option>
                <option value={10000}>10,000x</option>
                <option value={50000}>50,000x</option>
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
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? 'Placing...' : 'Long / Buy'}
              </button>
              <button
                className={`${styles.tradeButton} ${styles.shortButton}`}
                onClick={() => executeTrade('short')}
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? 'Placing...' : 'Short / Sell'}
              </button>
            </div>
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
                      <div className={styles.positionInfo}>
                        <span className={styles.positionSymbol}>{position.symbol}</span>
                        <span className={`${styles.positionType} ${position.side === 'long' ? styles.long : styles.short}`}>
                          {position.side.toUpperCase()}
                        </span>
                      </div>
                      <button
                        className={styles.closePositionButton}
                        onClick={() => closePosition(position.positionId)}
                      >
                        Close Position
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

    </div>
  );
}