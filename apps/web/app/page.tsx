"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useActualBackend } from './hooks/useActualBackend';
import styles from './page.module.css';
import LoadingScreen from './components/LoadingScreen';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
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
  token?: string;
}

export default function TradingPlatform() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  const symbols = ['BTCUSDT'];

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [positions, setPositions] = useState<Position[]>([]);
  const [marginAmount, setMarginAmount] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(1);
  const [isOrderFormCollapsed, setIsOrderFormCollapsed] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  const { priceData, candleData, isConnected, error, placeTrade } = useActualBackend(selectedTimeframe);

  // Calculate portfolio metrics
  const portfolioMetrics = React.useMemo(() => {
    const openPositions = positions.filter(p => p.status === 'open');

    const totalPnL = openPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
    const invested = openPositions.reduce((sum, pos) => sum + pos.margin, 0);
    const currentValue = invested + totalPnL;
    const percentageChange = invested > 0 ? (totalPnL / invested) * 100 : 0;
    const numberOfPositions = openPositions.length;

    return {
      invested,
      currentValue,
      percentageChange,
      numberOfPositions
    };
  }, [positions]);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;
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
    setIsChartReady(true);

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0]?.target !== chartContainerRef.current) return;
      const newEntry = entries[0];
      if (!newEntry) return;
      const { width, height } = newEntry.contentRect;
      chart.applyOptions({ width, height });
      setTimeout(() => {
        chart.timeScale().fitContent();
      }, 0);
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      setIsChartReady(false);
    };
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    if (isChartReady && candlestickSeriesRef.current && volumeSeriesRef.current && candleData.length > 0) {
      const formattedCandleData = candleData.map(candle => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
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
  }, [candleData, selectedSymbol, selectedTimeframe, isChartReady]);

  const fetchPositions = useCallback(async () => {
    if (!user?.userId) return;

    try {
      const response = await fetch(`http://localhost:8080/api/v1/trades/positions`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setPositions(data.positions);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  }, [user?.userId]);

  const fetchUserData = useCallback(async () => {
    if (!user?.userId) return;

    try {
      const response = await fetch(`http://localhost:8080/api/v1/user/data/${user.userId}`);
      const data = await response.json();

      if (data.success) {
        setUser(prev => ({
          ...prev!,
          balance: data.user.balance
        }));
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          parsed.balance = data.user.balance;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (!user?.userId) return;

    fetchPositions();
    fetchUserData();
    const positionsInterval = setInterval(fetchPositions, 5000);
    const userDataInterval = setInterval(fetchUserData, 10000);
    return () => {
      clearInterval(positionsInterval);
      clearInterval(userDataInterval);
    };
  }, [user?.userId, fetchPositions, fetchUserData]);

  const executeTrade = async (type: 'long' | 'short') => {

    if (isPlacingOrder) {
      return;
    }

    if (!user || !user.userId) {
      console.error('User not authenticated or userId missing:', user);
      showToast('Please login again to place orders', 'error');
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    const currentPrice = priceData[selectedSymbol]?.price || 0;

    if (!currentPrice || currentPrice <= 0) {
      console.warn('Price validation failed - price:', currentPrice);
      showToast(`Price data not available. Current price: ${currentPrice}`, 'warning');
      return;
    }

    setIsPlacingOrder(true);

    const positionSize = marginAmount * leverage;
    const quantity = positionSize / currentPrice;

    try {

      const response = await fetch('http://localhost:8080/api/v1/trades/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          // userId: user.userId, // Removed as it's now handled by token
          asset: selectedSymbol,
          type: type === 'long' ? 'buy' : 'sell',
          margin: marginAmount,
          leverage: leverage
        })
      });

      const result = await response.json();

      if (result.success) {

        const positionId = result.positionId;
        let positionConfirmed = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!positionConfirmed && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));

          const positionsResponse = await fetch(`http://localhost:8080/api/v1/trades/positions`, {
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          });
          const positionsData = await positionsResponse.json();

          if (positionsData.success) {
            const position = positionsData.positions.find((p: Position) => p.positionId === positionId);
            if (position) {
              positionConfirmed = true;
              showToast(`Order placed successfully! ${result.message}`, 'success');
              fetchPositions();
              fetchUserData();
              break;
            }
          }
          attempts++;
        }

        if (!positionConfirmed) {
          console.warn('Position not confirmed after verification');
          showToast('Order placed but position not confirmed yet. Refreshing...', 'warning');
          fetchPositions();
          fetchUserData();
        }
      } else {
        console.error('Trade failed:', result.message);
        showToast(`Trade failed: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Error placing trade:', error);
      showToast('Failed to place trade. Please try again.', 'error');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const closePosition = async (positionId: string) => {
    if (!user) {
      alert('User not authenticated');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/v1/trades/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          // userId: user.userId,
          positionId: positionId
        })
      });

      const result = await response.json();

      if (result.success) {
        fetchPositions();
        fetchUserData();
      }
    } catch (error) {
      console.error('Error closing position:', error);
      alert('Failed to close position. Please try again.');
    }
  };

  const handleSignup = async () => {
    if (!signupForm.username || !signupForm.password || !signupForm.confirmPassword) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (signupForm.password.length < 4) {
      showToast('Password must be at least 4 characters', 'warning');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/v1/user/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: signupForm.username,
          password: signupForm.password
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Account created successfully! Please login.', 'success');
        setIsSignupMode(false);
        setSignupForm({
          username: '',
          password: '',
          confirmPassword: ''
        });
        setLoginForm({ username: signupForm.username, password: '' });
      } else {
        showToast(result.message || 'Failed to create account', 'error');
      }
    } catch (error) {
      console.error('Signup error:', error);
      showToast('Failed to create account. Please try again.', 'error');
    }
  };

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      showToast('Please enter username and password', 'warning');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/v1/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        })
      });

      const result = await response.json();

      if (result.success) {
        const userData = {
          userId: result.user.userId,
          username: result.user.username,
          balance: result.user.balance,
          token: result.token
        };
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData));
        showToast('Login successful!', 'success');
        setLoginForm({ username: '', password: '' });
      } else {
        showToast(result.message || 'Invalid credentials', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('Failed to login. Please try again.', 'error');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setPositions([]);
    localStorage.removeItem('user');
    showToast('Logged out successfully', 'info');
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.tradingPlatform}>
        <div className={styles.loginContainer}>
          <div className={styles.loginForm}>
            <h1>100xCFD {isSignupMode ? 'Sign Up' : 'Login'}</h1>

            {isSignupMode ? (
              <>
                <input
                  type="text"
                  placeholder="Username"
                  value={signupForm.username}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, username: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleSignup()}
                />
                <button onClick={handleSignup}>Create Account</button>
                <p className={styles.loginToggle}>
                  Already have an account?{' '}
                  <span onClick={() => setIsSignupMode(false)}>Login here</span>
                </p>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button onClick={handleLogin}>Login</button>
                <p className={styles.loginToggle}>
                  Don't have an account?{' '}
                  <span onClick={() => setIsSignupMode(true)}>Sign up here</span>
                </p>
              </>
            )}
          </div>
        </div>

        <div className={styles.toastContainer}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}
              onClick={() => removeToast(toast.id)}
            >
              <span className={styles.toastIcon}>
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'warning' && '⚠️'}
                {toast.type === 'info' && 'ℹ️'}
              </span>
              <span className={styles.toastMessage}>{toast.message}</span>
              <button className={styles.toastClose} onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}>×</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tradingPlatform}>
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
          <button className={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className={styles.mainContent}>
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

        <div className={styles.tradingPanel}>
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
                  <option value={300}>300x</option>
                  <option value={400}>400x</option>
                  <option value={500}>500x</option>
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

          <div className={styles.positionsPanel}>
            <div className={styles.portfolioSummary}>
              <h3>Portfolio Overview</h3>
              <div className={styles.portfolioMetrics}>
                <div className={styles.portfolioMetricCard}>
                  <span className={styles.metricLabel}>Invested</span>
                  <span className={styles.metricValue}>
                    ${portfolioMetrics.invested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={styles.metricSubtext}>
                    {portfolioMetrics.numberOfPositions} Position{portfolioMetrics.numberOfPositions !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={styles.portfolioMetricCard}>
                  <span className={styles.metricLabel}>Current Value</span>
                  <span className={`${styles.metricValue} ${portfolioMetrics.currentValue >= portfolioMetrics.invested ? styles.positive : styles.negative}`}>
                    ${portfolioMetrics.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`${styles.metricSubtext} ${portfolioMetrics.percentageChange >= 0 ? styles.positive : styles.negative}`}>
                    {portfolioMetrics.percentageChange >= 0 ? '+' : ''}{portfolioMetrics.percentageChange.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <h3>Open Positions</h3>
            {positions.length === 0 ? (
              <p>No open positions</p>
            ) : (
              <div className={styles.positionsList}>
                {positions.filter(p => p.status === 'open').map(position => (
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

      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}
            onClick={() => removeToast(toast.id)}
          >
            <span className={styles.toastIcon}>
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <span className={styles.toastMessage}>{toast.message}</span>
            <button className={styles.toastClose} onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}>×</button>
          </div>
        ))}
      </div>

    </div>
  );
}