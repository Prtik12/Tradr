'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { initializePool, getPoolConfig } from '@/lib/anchor';

type PoolStatus = 'idle' | 'validating' | 'creating' | 'success';

export default function CreatePoolPage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [formData, setFormData] = useState({
    tokenMint: '',
    initialTokenAmount: '',
    initialSolAmount: '',
  });

  const [status, setStatus] = useState<PoolStatus>('idle');
  const [poolId, setPoolId] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ symbol: string; decimals: number } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateToken = async () => {
    if (!formData.tokenMint) {
      toast.error('Please enter a token mint address');
      return false;
    }

    try {
      const mintPubkey = new PublicKey(formData.tokenMint);

      // Fetch mint account info
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);

      if (!mintInfo.value) {
        toast.error('Token mint not found');
        return false;
      }

      const data = mintInfo.value.data;
      if (typeof data === 'string' || !('parsed' in data)) {
        toast.error('Invalid token mint');
        return false;
      }

      const decimals = data.parsed.info.decimals;

      // Enforce 9 decimals requirement
      if (decimals !== 9) {
        toast.error(`Token must have 9 decimals (found ${decimals}). All tokens on Tradr must match SOL's precision.`);
        return false;
      }

      // Try to fetch token metadata (symbol, name) from our registry
      try {
        const response = await fetch(`/api/tokens/${formData.tokenMint}`);
        if (response.ok) {
          const tokenData = await response.json();
          setTokenInfo({ symbol: tokenData.symbol, decimals });
          toast.success(`Token validated: ${tokenData.symbol}`);
        } else {
          setTokenInfo({ symbol: 'UNKNOWN', decimals });
          toast.success('Token validated (metadata not found in registry)');
        }
      } catch {
        setTokenInfo({ symbol: 'UNKNOWN', decimals });
        toast.success('Token validated');
      }

      return true;
    } catch (error) {
      toast.error('Invalid token mint address');
      return false;
    }
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    // Validate inputs
    if (!formData.tokenMint || !formData.initialTokenAmount || !formData.initialSolAmount) {
      toast.error('Please fill in all fields');
      return;
    }

    const tokenAmount = parseFloat(formData.initialTokenAmount);
    const solAmount = parseFloat(formData.initialSolAmount);

    if (tokenAmount <= 0 || solAmount <= 0) {
      toast.error('Amounts must be greater than 0');
      return;
    }

    // Validate token first
    setStatus('validating');
    const isValid = await validateToken();
    if (!isValid) {
      setStatus('idle');
      return;
    }

    setStatus('creating');

    if (!anchorWallet) {
      toast.error('Wallet not connected');
      setStatus('idle');
      return;
    }

    try {
      // Define SOL mint as native mint placeholder (wrapped SOL)
      const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
      const tokenMintPubkey = new PublicKey(formData.tokenMint);

      // Check if pool already exists
      const poolCheck = await getPoolConfig(connection, anchorWallet, SOL_MINT, tokenMintPubkey);

      if (poolCheck.exists) {
        toast.error('Pool already exists for this token pair');
        setStatus('idle');
        return;
      }

      // Initialize pool on-chain
      // Default fee: 300 basis points (3%)
      // Authority: user's wallet (can lock/unlock pool)
      const signature = await initializePool({
        connection,
        wallet: anchorWallet,
        mintX: SOL_MINT,
        mintY: tokenMintPubkey,
        fee: 300,
        authority: publicKey,
      });

      toast.success('Pool initialized on-chain!');

      // Store pool metadata in database
      try {
        await fetch('/api/pools/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenMint: formData.tokenMint,
            initialTokenAmount: tokenAmount,
            initialSolAmount: solAmount,
            creator: publicKey.toString(),
            signature,
            locked: true,
          }),
        });
      } catch (dbError) {
        console.error('Failed to store pool metadata:', dbError);
        // Don't fail if DB storage fails
      }

      setPoolId(signature);
      setStatus('success');

      // Reset form
      setFormData({
        tokenMint: '',
        initialTokenAmount: '',
        initialSolAmount: '',
      });
      setTokenInfo(null);

    } catch (error) {
      console.error('Error creating pool:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create pool');
      setStatus('idle');
    }
  };

  const calculatePrice = () => {
    const tokenAmount = parseFloat(formData.initialTokenAmount);
    const solAmount = parseFloat(formData.initialSolAmount);
    if (tokenAmount > 0 && solAmount > 0) {
      return (solAmount / tokenAmount).toFixed(9);
    }
    return '0';
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Create Pool</h1>
          <p className="text-white/60 text-lg">
            Create a new liquidity pool for SOL/Token pairs
          </p>
        </div>

        {status === 'success' && poolId ? (
          <div className="bg-black/30 border border-primary/30 p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-primary">Pool Created Successfully!</h2>
              <p className="text-white/60">
                Your liquidity pool has been initialized on-chain. The pool starts in locked state.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-white/40 text-xs">Transaction Signature</Label>
                <div className="bg-black/50 border border-white/10 p-4 mt-2">
                  <code className="text-sm text-primary break-all">{poolId}</code>
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 p-4 space-y-2">
                <p className="text-sm text-white/60">
                  <strong className="text-white">What happens next?</strong>
                </p>
                <ul className="text-sm text-white/60 space-y-1 list-disc list-inside">
                  <li>Pool is created but starts in <strong>locked</strong> state</li>
                  <li>As the pool authority, you can unlock it when ready</li>
                  <li>Add initial liquidity before unlocking</li>
                  <li>Once unlocked, the pool will be available for swaps</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => window.open(`https://explorer.solana.com/tx/${poolId}?cluster=devnet`, '_blank')}
                >
                  View on Explorer
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    setStatus('idle');
                    setPoolId(null);
                  }}
                >
                  Create Another Pool
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreatePool} className="space-y-6">
            <div className="bg-black/30 border border-white/10 p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tokenMint">Token Mint Address *</Label>
                <div className="flex gap-2">
                  <Input
                    id="tokenMint"
                    name="tokenMint"
                    placeholder="Enter SPL token mint address"
                    value={formData.tokenMint}
                    onChange={handleInputChange}
                    required
                    disabled={status !== 'idle'}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={validateToken}
                    disabled={!formData.tokenMint || status !== 'idle'}
                  >
                    Validate
                  </Button>
                </div>
                {tokenInfo && (
                  <p className="text-xs text-primary">
                    ✓ Token validated: {tokenInfo.symbol} ({tokenInfo.decimals} decimals)
                  </p>
                )}
                <p className="text-xs text-white/40">
                  Token must have 9 decimals for SOL compatibility
                </p>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                <h3 className="text-lg font-bold">Initial Liquidity (Optional)</h3>
                <p className="text-sm text-white/60">
                  Provide initial liquidity to bootstrap the pool. You can also add liquidity after pool approval.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="initialTokenAmount">Token Amount</Label>
                  <Input
                    id="initialTokenAmount"
                    name="initialTokenAmount"
                    type="number"
                    placeholder="0.0"
                    value={formData.initialTokenAmount}
                    onChange={handleInputChange}
                    disabled={status !== 'idle'}
                    min="0"
                    step="any"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialSolAmount">SOL Amount</Label>
                  <Input
                    id="initialSolAmount"
                    name="initialSolAmount"
                    type="number"
                    placeholder="0.0"
                    value={formData.initialSolAmount}
                    onChange={handleInputChange}
                    disabled={status !== 'idle'}
                    min="0"
                    step="any"
                  />
                </div>

                {formData.initialTokenAmount && formData.initialSolAmount && (
                  <div className="bg-primary/10 border border-primary/30 p-4 space-y-1">
                    <p className="text-sm text-white/60">Initial Price</p>
                    <p className="text-2xl font-bold text-primary">
                      {calculatePrice()} SOL per {tokenInfo?.symbol || 'TOKEN'}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-black/50 border border-primary/30 p-4 space-y-2">
                <p className="text-sm font-bold text-primary">⚠️ Important Notes</p>
                <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                  <li>All pools start as <strong>locked</strong> and require admin approval</li>
                  <li>Pools use constant-product AMM formula (x × y = k)</li>
                  <li>LP tokens will have 9 decimals matching base tokens</li>
                  <li>Initial liquidity deposit happens after admin approval</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setFormData({ tokenMint: '', initialTokenAmount: '', initialSolAmount: '' });
                  setTokenInfo(null);
                }}
                disabled={status !== 'idle'}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="default"
                className="flex-1"
                disabled={status !== 'idle' || !publicKey}
              >
                {status === 'validating' && 'Validating...'}
                {status === 'creating' && 'Creating...'}
                {status === 'idle' && 'Submit Pool Request'}
              </Button>
            </div>

            {!publicKey && (
              <p className="text-center text-sm text-primary">
                Please connect your wallet to create a pool
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
