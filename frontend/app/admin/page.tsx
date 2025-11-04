'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { unlockPool, getPoolConfig } from '@/lib/anchor';

interface Pool {
  id: string;
  configAddress: string;
  tokenXMint: string;
  tokenYMint: string;
  lpMintAddress: string;
  fee: number;
  authority: string;
  locked: boolean;
  creator: string;
  creationSignature: string;
  tokenX: {
    symbol: string;
    name: string;
  };
  tokenY: {
    symbol: string;
    name: string;
  };
}

export default function AdminPage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockingPool, setUnlockingPool] = useState<string | null>(null);

  // Fetch pending pools
  useEffect(() => {
    fetchPools();
  }, []);

  const fetchPools = async () => {
    try {
      const response = await fetch('/api/admin/pools');
      if (response.ok) {
        const data = await response.json();
        setPools(data.pools);
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
      toast.error('Failed to load pools');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockPool = async (pool: Pool) => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    // Check if current user is the pool authority
    if (pool.authority !== publicKey.toString()) {
      toast.error('Only pool authority can unlock the pool');
      return;
    }

    setUnlockingPool(pool.id);

    try {
      // Unlock pool on-chain
      const signature = await unlockPool(
        connection,
        { publicKey, signTransaction: async (tx) => tx } as any, // Simplified for demo
        new PublicKey(pool.tokenXMint),
        new PublicKey(pool.tokenYMint)
      );

      // Update pool status in database
      await fetch('/api/admin/pools/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolId: pool.id,
          signature,
        }),
      });

      toast.success('Pool unlocked successfully!');
      fetchPools(); // Refresh the list

    } catch (error) {
      console.error('Error unlocking pool:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unlock pool');
    } finally {
      setUnlockingPool(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl">Loading pools...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-white/60 text-lg">
            Manage liquidity pools and oversee platform operations
          </p>
        </div>

        {/* Pool Management */}
        <div className="bg-black/30 border border-white/10 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Pool Management</h2>
            <div className="text-sm text-white/60">
              {pools.filter(p => p.locked).length} pools pending approval
            </div>
          </div>

          {pools.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              No pools to manage at this time
            </div>
          ) : (
            <div className="space-y-4">
              {pools.map((pool) => (
                <div
                  key={pool.id}
                  className="bg-black/50 border border-white/10 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold">
                          {pool.tokenX.symbol}/{pool.tokenY.symbol}
                        </h3>
                        <div className={`px-3 py-1 text-xs font-bold uppercase ${
                          pool.locked
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {pool.locked ? 'Locked' : 'Active'}
                        </div>
                      </div>
                      <div className="text-sm text-white/60 space-y-1">
                        <div>Fee: {pool.fee / 100}%</div>
                        <div>Authority: {pool.authority.slice(0, 8)}...{pool.authority.slice(-8)}</div>
                        <div>LP Mint: {pool.lpMintAddress.slice(0, 8)}...{pool.lpMintAddress.slice(-8)}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {pool.locked && (
                        <Button
                          onClick={() => handleUnlockPool(pool)}
                          disabled={unlockingPool === pool.id || pool.authority !== publicKey?.toString()}
                          variant="default"
                          className="w-full"
                        >
                          {unlockingPool === pool.id ? 'Unlocking...' : 'Unlock Pool'}
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(
                          `https://explorer.solana.com/address/${pool.configAddress}?cluster=devnet`,
                          '_blank'
                        )}
                        className="w-full"
                      >
                        View on Explorer
                      </Button>
                    </div>
                  </div>

                  {pool.locked && pool.authority !== publicKey?.toString() && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-4">
                      <p className="text-sm text-yellow-400">
                        <strong>Note:</strong> Only the pool authority ({pool.authority.slice(0, 8)}...{pool.authority.slice(-8)})
                        can unlock this pool.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Statistics */}
        <div className="mt-8 bg-black/30 border border-white/10 p-8">
          <h2 className="text-2xl font-bold mb-6">Platform Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{pools.length}</div>
              <div className="text-sm text-white/60">Total Pools</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">
                {pools.filter(p => !p.locked).length}
              </div>
              <div className="text-sm text-white/60">Active Pools</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">
                {pools.filter(p => p.locked).length}
              </div>
              <div className="text-sm text-white/60">Locked Pools</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
