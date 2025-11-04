'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { executeSwap, getPoolConfig } from '@/lib/anchor';

type SwapDirection = 'sol_to_token' | 'token_to_sol';

interface PriceData {
  price: number;
  expo: number;
  timestamp: number;
}

export default function SwapPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [tokenMint, setTokenMint] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [direction, setDirection] = useState<SwapDirection>('sol_to_token');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [slippage, setSlippage] = useState('0.5'); // 0.5% default
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Fetch Pyth price for SOL/USD
  useEffect(() => {
    const fetchPrice = async () => {
      if (!tokenMint) return;

      setPriceLoading(true);
      try {
        // Fetch SOL/USD price from Pyth
        const response = await fetch('/api/prices/sol-usd');
        if (response.ok) {
          const data = await response.json();
          setPriceData(data);
        }
      } catch (error) {
        console.error('Error fetching price:', error);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [tokenMint]);

  const validateToken = async () => {
    if (!tokenMint) {
      toast.error('Please enter a token mint address');
      return false;
    }

    try {
      const mintPubkey = new PublicKey(tokenMint);
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);

      if (!mintInfo.value) {
        toast.error('Token not found');
        return false;
      }

      const data = mintInfo.value.data;
      if (typeof data === 'string' || !('parsed' in data)) {
        toast.error('Invalid token');
        return false;
      }

      const decimals = data.parsed.info.decimals;
      if (decimals !== 9) {
        toast.error(`Token must have 9 decimals (found ${decimals})`);
        return false;
      }

      // Fetch token metadata
      try {
        const response = await fetch(`/api/tokens/${tokenMint}`);
        if (response.ok) {
          const tokenData = await response.json();
          setTokenSymbol(tokenData.symbol);
        } else {
          setTokenSymbol('TOKEN');
        }
      } catch {
        setTokenSymbol('TOKEN');
      }

      return true;
    } catch (error) {
      toast.error('Invalid token mint address');
      return false;
    }
  };

  const calculateOutput = () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setOutputAmount('');
      return;
    }

    // TODO: Replace with actual AMM calculation using pool reserves
    // For now, use a mock 1:100 ratio for demonstration
    const input = parseFloat(inputAmount);
    const mockRatio = direction === 'sol_to_token' ? 100 : 0.01;
    const output = input * mockRatio;

    // Apply slippage
    const slippageAmount = output * (parseFloat(slippage) / 100);
    const finalOutput = direction === 'sol_to_token'
      ? output - slippageAmount
      : output - slippageAmount;

    setOutputAmount(finalOutput.toFixed(9));
  };

  useEffect(() => {
    calculateOutput();
  }, [inputAmount, direction, slippage]);

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!tokenMint) {
      toast.error('Please enter a token mint address');
      return;
    }

    const isValid = await validateToken();
    if (!isValid) return;

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSwapping(true);

    if (!anchorWallet) {
      toast.error('Wallet not connected');
      setIsSwapping(false);
      return;
    }

    try {
      const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
      const tokenMintPubkey = new PublicKey(tokenMint);

      // Check if pool exists
      const poolCheck = await getPoolConfig(connection, anchorWallet, SOL_MINT, tokenMintPubkey);

      if (!poolCheck.exists) {
        toast.error('Pool does not exist for this token pair. Create a pool first.');
        setIsSwapping(false);
        return;
      }

      // Check if pool is locked
      if (poolCheck.config?.locked) {
        toast.error('Pool is currently locked. Cannot execute swaps.');
        setIsSwapping(false);
        return;
      }

      // Check price deviation (if Pyth data available)
      if (priceData) {
        // TODO: Implement price deviation guard
        // Compare on-chain pool price with Pyth oracle price
        // Reject if deviation > threshold (e.g., 5%)
      }

      // Calculate minimum output with slippage
      const inputAmt = parseFloat(inputAmount);
      const outputAmt = parseFloat(outputAmount);
      const slippageTolerance = parseFloat(slippage) / 100;
      const minOutput = outputAmt * (1 - slippageTolerance);

      // Execute swap
      const isX = direction === 'sol_to_token'; // true = swap SOL for token
      const signature = await executeSwap({
        connection,
        wallet: anchorWallet,
        mintX: SOL_MINT,
        mintY: tokenMintPubkey,
        isX,
        amount: inputAmt,
        minOut: minOutput,
      });

      toast.success('Swap executed successfully!');
      console.log('Swap signature:', signature);

      // Reset form
      setInputAmount('');
      setOutputAmount('');

    } catch (error) {
      console.error('Error swapping:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to execute swap');
    } finally {
      setIsSwapping(false);
    }
  };

  const switchDirection = () => {
    setDirection(prev =>
      prev === 'sol_to_token' ? 'token_to_sol' : 'sol_to_token'
    );
    setInputAmount(outputAmount);
    setOutputAmount('');
  };

  const getPriceImpact = () => {
    // TODO: Calculate actual price impact from pool reserves
    const input = parseFloat(inputAmount);
    if (!input || input <= 0) return '0.00';

    // Mock calculation
    const impact = (input / 1000) * 100; // Mock: 0.1% per 1 SOL
    return Math.min(impact, 15).toFixed(2); // Cap at 15%
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Swap</h1>
          <p className="text-white/60 text-lg">
            Swap tokens using constant-product AMM pools
          </p>
        </div>

        <form onSubmit={handleSwap} className="space-y-6">
          <div className="bg-black/30 border border-white/10 p-8 space-y-6">
            {/* Token Selection */}
            <div className="space-y-2">
              <Label htmlFor="tokenMint">Token Mint Address</Label>
              <div className="flex gap-2">
                <Input
                  id="tokenMint"
                  placeholder="Enter SPL token mint address"
                  value={tokenMint}
                  onChange={(e) => setTokenMint(e.target.value)}
                  required
                  disabled={isSwapping}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={validateToken}
                  disabled={!tokenMint || isSwapping}
                >
                  Validate
                </Button>
              </div>
              {tokenSymbol && (
                <p className="text-xs text-primary">
                  ✓ Token: {tokenSymbol}
                </p>
              )}
            </div>

            {/* Input Amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="inputAmount">
                  You Pay
                </Label>
                <span className="text-sm text-white/60">
                  {direction === 'sol_to_token' ? 'SOL' : tokenSymbol || 'TOKEN'}
                </span>
              </div>
              <Input
                id="inputAmount"
                type="number"
                placeholder="0.0"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                disabled={isSwapping}
                min="0"
                step="any"
              />
            </div>

            {/* Switch Direction Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={switchDirection}
                disabled={isSwapping}
                className="bg-black/50 border border-white/20 hover:border-primary p-3 transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </button>
            </div>

            {/* Output Amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="outputAmount">
                  You Receive
                </Label>
                <span className="text-sm text-white/60">
                  {direction === 'token_to_sol' ? 'SOL' : tokenSymbol || 'TOKEN'}
                </span>
              </div>
              <Input
                id="outputAmount"
                type="number"
                placeholder="0.0"
                value={outputAmount}
                disabled
                className="bg-black/70"
              />
            </div>

            {/* Slippage Tolerance */}
            <div className="space-y-2">
              <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
              <Input
                id="slippage"
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                disabled={isSwapping}
                min="0.1"
                max="50"
                step="0.1"
              />
            </div>

            {/* Swap Details */}
            {inputAmount && outputAmount && (
              <div className="bg-black/50 border border-white/10 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Price Impact</span>
                  <span className={`font-bold ${parseFloat(getPriceImpact()) > 5 ? 'text-red-500' : 'text-primary'}`}>
                    {getPriceImpact()}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Minimum Received</span>
                  <span className="text-white">
                    {(parseFloat(outputAmount) * (1 - parseFloat(slippage) / 100)).toFixed(9)}{' '}
                    {direction === 'token_to_sol' ? 'SOL' : tokenSymbol}
                  </span>
                </div>
                {priceData && (
                  <div className="flex justify-between">
                    <span className="text-white/60">SOL/USD Oracle</span>
                    <span className="text-primary">
                      ${(priceData.price * Math.pow(10, priceData.expo)).toFixed(2)}
                      {priceLoading && ' (updating...)'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {parseFloat(getPriceImpact()) > 5 && (
              <div className="bg-red-500/10 border border-red-500/30 p-4">
                <p className="text-sm text-red-500 font-bold">⚠️ High Price Impact</p>
                <p className="text-xs text-white/60 mt-1">
                  This swap will significantly affect the pool price. Consider splitting into smaller trades.
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="default"
            className="w-full"
            disabled={isSwapping || !publicKey || !tokenMint || !inputAmount}
          >
            {isSwapping ? 'Swapping...' : 'Swap'}
          </Button>

          {!publicKey && (
            <p className="text-center text-sm text-primary">
              Please connect your wallet to swap
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
