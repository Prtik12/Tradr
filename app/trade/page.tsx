'use client';

import { useState, useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  createChart,
  ColorType,
  IChartApi,
  CandlestickData,
  LineData,
} from 'lightweight-charts';

type OrderType = 'market' | 'limit';
type OrderSide = 'buy' | 'sell';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface Order {
  id: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  size: number;
  filled: number;
  status: 'open' | 'filled' | 'cancelled';
  timestamp: number;
}

interface Trade {
  price: number;
  size: number;
  side: OrderSide;
  timestamp: number;
}

// Client-side component to prevent hydration mismatch with time formatting
function RecentTradeRow({ trade }: { trade: Trade }) {
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    setFormattedTime(new Date(trade.timestamp).toLocaleTimeString());
  }, [trade.timestamp]);

  return (
    <div className="grid grid-cols-3 text-sm">
      <div className={trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
        {trade.price.toFixed(2)}
      </div>
      <div className="text-right text-white/60">
        {trade.size.toFixed(2)}
      </div>
      <div className="text-right text-white/40 text-xs">
        {formattedTime}
      </div>
    </div>
  );
}

export default function TradePage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  const [marketId, setMarketId] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data for development
  const [bids, setBids] = useState<OrderBookEntry[]>([
    { price: 124.95, size: 10.5, total: 10.5 },
    { price: 124.90, size: 25.3, total: 35.8 },
    { price: 124.85, size: 15.7, total: 51.5 },
    { price: 124.80, size: 30.2, total: 81.7 },
    { price: 124.75, size: 20.1, total: 101.8 },
  ]);

  const [asks, setAsks] = useState<OrderBookEntry[]>([
    { price: 125.05, size: 12.3, total: 12.3 },
    { price: 125.10, size: 18.5, total: 30.8 },
    { price: 125.15, size: 22.1, total: 52.9 },
    { price: 125.20, size: 15.8, total: 68.7 },
    { price: 125.25, size: 25.5, total: 94.2 },
  ]);

  const [recentTrades, setRecentTrades] = useState<Trade[]>([
    { price: 125.02, size: 5.2, side: 'buy', timestamp: Date.now() - 5000 },
    { price: 125.01, size: 3.8, side: 'sell', timestamp: Date.now() - 10000 },
    { price: 125.05, size: 7.1, side: 'buy', timestamp: Date.now() - 15000 },
    { price: 125.00, size: 2.5, side: 'sell', timestamp: Date.now() - 20000 },
    { price: 124.98, size: 4.3, side: 'sell', timestamp: Date.now() - 25000 },
  ]);

  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const [currentPrice, setCurrentPrice] = useState(125.02);

  // Fetch user orders
  const fetchOrders = async () => {
    if (!publicKey) return;

    setIsLoadingOrders(true);
    try {
      const response = await fetch(`/api/orders?user=${publicKey.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const orders: Order[] = data.orders.map((o: any) => ({
          id: o.orderId,
          side: o.side as OrderSide,
          type: o.orderType as OrderType,
          price: o.price,
          size: o.quantity,
          filled: o.filledQty,
          status: o.status as 'open' | 'filled' | 'cancelled',
          timestamp: new Date(o.createdAt).getTime(),
        }));
        setOpenOrders(orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch orders when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchOrders();
    }
  }, [publicKey]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) {
      console.log('Chart container not available');
      return;
    }

    try {
      console.log('Creating chart...');
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#DDD',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      console.log('Chart created:', chart);
      console.log('Chart methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(chart)));

      // Try candlestick series first
      let series;
      try {
        if (typeof (chart as any).addCandlestickSeries === 'function') {
          series = (chart as any).addCandlestickSeries({
            upColor: '#00FF00',
            downColor: '#FF0000',
            borderVisible: false,
            wickUpColor: '#00FF00',
            wickDownColor: '#FF0000',
          });

          console.log('Candlestick series created:', series);

          // Mock candlestick data
          const generateMockData = (): CandlestickData[] => {
            const data: CandlestickData[] = [];
            const now = Math.floor(Date.now() / 1000);
            let price = 125;

            for (let i = 100; i >= 0; i--) {
              const time = now - i * 300; // 5-minute candles
              const open = price;
              const close = price + (Math.random() - 0.5) * 2;
              const high = Math.max(open, close) + Math.random() * 0.5;
              const low = Math.min(open, close) - Math.random() * 0.5;

              data.push({
                time: time as any,
                open,
                high,
                low,
                close,
              });

              price = close;
            }

            return data;
          };

          series.setData(generateMockData());
        } else {
          console.log('addCandlestickSeries not available, trying line series');
          // Fallback to line chart
          series = (chart as any).addLineSeries({
            color: '#00FF00',
            lineWidth: 2,
          });

          console.log('Line series created:', series);

          // Mock line data
          const generateLineData = (): LineData[] => {
            const data: LineData[] = [];
            const now = Math.floor(Date.now() / 1000);
            let price = 125;

            for (let i = 100; i >= 0; i--) {
              const time = now - i * 300;
              price += (Math.random() - 0.5) * 2;

              data.push({
                time: time as any,
                value: price,
              });
            }

            return data;
          };

          series.setData(generateLineData());
        }
      } catch (seriesError) {
        console.error('Error creating series:', seriesError);
        return;
      }

      chartRef.current = chart;
      seriesRef.current = series;

      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (error) {
      console.error('Error initializing chart:', error);
      console.error('Chart creation failed:', error);
    }
  }, []);

  const validateMarket = async () => {
    if (!marketId) {
      toast.error('Please enter a market ID');
      return false;
    }

    try {
      // TODO: Validate OpenBook market exists
      // For now, just accept any input
      setTokenSymbol('TOKEN');
      toast.success('Market validated (mock)');
      return true;
    } catch (error) {
      toast.error('Invalid market ID');
      return false;
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!marketId) {
      toast.error('Please enter a market ID');
      return;
    }

    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!size || parseFloat(size) <= 0) {
      toast.error('Please enter a valid size');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate order ID
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // For now, store order in database (OpenBook integration would come later)
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userAddress: publicKey.toString(),
          marketAddress: marketId, // Using marketId as market address for now
          poolAddress: '', // Would be derived from market in real implementation
          side: orderSide,
          orderType,
          price: orderType === 'limit' ? parseFloat(price) : currentPrice,
          quantity: parseFloat(size),
          signature: 'mock_signature', // Would be real transaction signature
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const data = await response.json();

      toast.success('Order placed successfully!');

      // Refresh orders
      fetchOrders();

      // Reset form
      setPrice('');
      setSize('');

    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel order');
      }

      toast.success('Order cancelled successfully!');

      // Refresh orders
      fetchOrders();

    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const getSpread = () => {
    if (asks.length === 0 || bids.length === 0) return 0;
    return asks[0].price - bids[0].price;
  };

  const getSpreadPercentage = () => {
    const spread = getSpread();
    if (spread === 0 || bids.length === 0) return '0.00';
    return ((spread / bids[0].price) * 100).toFixed(2);
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="container max-w-[1800px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Trade</h1>
          <p className="text-white/60">
            Spot trading with Central Limit Order Book (CLOB)
          </p>
        </div>

        {/* Market Selection */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 max-w-md">
            <div className="flex gap-2">
              <Input
                placeholder="Enter OpenBook market ID"
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                className="flex-1"
              />
              <Button variant="secondary" onClick={validateMarket}>
                Load Market
              </Button>
            </div>
            <p className="text-xs text-white/40 mt-2">
              OpenBook market integration coming soon
            </p>
          </div>
        </div>

        {/* Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Order Book */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-black/30 border border-white/10 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Order Book</h3>
                <div className="text-sm text-white/60">
                  Spread: {getSpreadPercentage()}%
                </div>
              </div>

              {/* Asks */}
              <div className="space-y-1 mb-4">
                <div className="grid grid-cols-3 text-xs text-white/40 mb-2">
                  <div>Price</div>
                  <div className="text-right">Size</div>
                  <div className="text-right">Total</div>
                </div>
                {asks.slice().reverse().map((ask, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 text-sm relative cursor-pointer hover:bg-white/5"
                    onClick={() => setPrice(ask.price.toString())}
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                      style={{ width: `${(ask.total / 100) * 100}%` }}
                    />
                    <div className="text-red-500 relative z-10">{ask.price.toFixed(2)}</div>
                    <div className="text-right text-white/60 relative z-10">{ask.size.toFixed(2)}</div>
                    <div className="text-right text-white/40 relative z-10">{ask.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Current Price */}
              <div className="text-center py-3 bg-primary/10 border-y border-primary/30 mb-4">
                <div className="text-2xl font-bold text-primary">
                  {currentPrice.toFixed(2)}
                </div>
                <div className="text-xs text-white/60">
                  ${currentPrice.toFixed(2)} USD
                </div>
              </div>

              {/* Bids */}
              <div className="space-y-1">
                {bids.map((bid, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 text-sm relative cursor-pointer hover:bg-white/5"
                    onClick={() => setPrice(bid.price.toString())}
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-green-500/10"
                      style={{ width: `${(bid.total / 100) * 100}%` }}
                    />
                    <div className="text-green-500 relative z-10">{bid.price.toFixed(2)}</div>
                    <div className="text-right text-white/60 relative z-10">{bid.size.toFixed(2)}</div>
                    <div className="text-right text-white/40 relative z-10">{bid.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Trades */}
            <div className="bg-black/30 border border-white/10 p-4">
              <h3 className="text-lg font-bold mb-4">Recent Trades</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 text-xs text-white/40 mb-2">
                  <div>Price</div>
                  <div className="text-right">Size</div>
                  <div className="text-right">Time</div>
                </div>
                {recentTrades.map((trade, i) => (
                  <RecentTradeRow key={i} trade={trade} />
                ))}
              </div>
            </div>
          </div>

          {/* Center Column - Chart */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-black/30 border border-white/10 p-4">
              <div className="mb-4">
                <h3 className="text-lg font-bold">SOL/TOKEN</h3>
                <p className="text-sm text-white/60">5m Candlesticks</p>
              </div>
              <div ref={chartContainerRef} />
            </div>
          </div>

          {/* Right Column - Order Entry & Open Orders */}
          <div className="lg:col-span-3 space-y-4">
            {/* Order Entry */}
            <div className="bg-black/30 border border-white/10 p-4">
              <h3 className="text-lg font-bold mb-4">Place Order</h3>

              <form onSubmit={handleSubmitOrder} className="space-y-4">
                {/* Order Type */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm border transition-colors ${
                      orderType === 'limit'
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-black/50 border-white/10 text-white/60'
                    }`}
                    onClick={() => setOrderType('limit')}
                  >
                    Limit
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm border transition-colors ${
                      orderType === 'market'
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-black/50 border-white/10 text-white/60'
                    }`}
                    onClick={() => setOrderType('market')}
                  >
                    Market
                  </button>
                </div>

                {/* Buy/Sell Tabs */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm border transition-colors ${
                      orderSide === 'buy'
                        ? 'bg-green-500/20 border-green-500 text-green-500'
                        : 'bg-black/50 border-white/10 text-white/60'
                    }`}
                    onClick={() => setOrderSide('buy')}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm border transition-colors ${
                      orderSide === 'sell'
                        ? 'bg-red-500/20 border-red-500 text-red-500'
                        : 'bg-black/50 border-white/10 text-white/60'
                    }`}
                    onClick={() => setOrderSide('sell')}
                  >
                    Sell
                  </button>
                </div>

                {/* Price */}
                {orderType === 'limit' && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={isSubmitting}
                      min="0"
                      step="any"
                    />
                  </div>
                )}

                {/* Size */}
                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    type="number"
                    placeholder="0.0"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    disabled={isSubmitting}
                    min="0"
                    step="any"
                  />
                </div>

                {/* Total */}
                {size && (orderType === 'market' || price) && (
                  <div className="bg-black/50 border border-white/10 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Total</span>
                      <span className="text-white font-bold">
                        {(
                          parseFloat(size) *
                          (orderType === 'market' ? currentPrice : parseFloat(price))
                        ).toFixed(2)}{' '}
                        SOL
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="default"
                  className={`w-full ${
                    orderSide === 'buy'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                  disabled={isSubmitting || !publicKey}
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${tokenSymbol || 'TOKEN'}`}
                </Button>

                {!publicKey && (
                  <p className="text-center text-xs text-primary">
                    Connect wallet to trade
                  </p>
                )}
              </form>
            </div>

            {/* Open Orders */}
            <div className="bg-black/30 border border-white/10 p-4">
              <h3 className="text-lg font-bold mb-4">Open Orders</h3>
              {isLoadingOrders ? (
                <p className="text-sm text-white/40 text-center py-8">
                  Loading orders...
                </p>
              ) : openOrders.filter(o => o.status === 'open').length === 0 ? (
                <p className="text-sm text-white/40 text-center py-8">
                  No open orders
                </p>
              ) : (
                <div className="space-y-2">
                  {openOrders
                    .filter(o => o.status === 'open')
                    .map((order) => (
                      <div
                        key={order.id}
                        className="bg-black/50 border border-white/10 p-3 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span
                              className={`text-sm font-bold ${
                                order.side === 'buy' ? 'text-green-500' : 'text-red-500'
                              }`}
                            >
                              {order.side.toUpperCase()} {order.type.toUpperCase()}
                            </span>
                            <div className="text-xs text-white/60 mt-1">
                              {order.price.toFixed(2)} × {order.size.toFixed(2)}
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-xs h-7"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
