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

interface PoolRequest {
  id: string;
  configAddress: string;
  tokenXMint: string;
  tokenYMint: string;
  lpMintAddress: string;
  escrowXAddress: string;
  escrowYAddress: string;
  fee: number;
  authority: string;
  status: string;
  creator: string;
  creationSignature: string;
  createdAt: string;
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
  const [poolRequests, setPoolRequests] = useState<PoolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockingPool, setUnlockingPool] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Fetch pools and requests
  useEffect(() => {
    fetchPools();
    fetchPoolRequests();
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

  const fetchPoolRequests = async () => {
    try {
      const response = await fetch('/api/admin/pool-requests?status=pending');
      if (response.ok) {
        const data = await response.json();
        setPoolRequests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching pool requests:', error);
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

  const handleApproveRequest = async (request: PoolRequest) => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setProcessingRequest(request.id);

    try {
      // TODO: Call on-chain approve_pool instruction here
      // For now, just update the database
      const response = await fetch(`/api/admin/pool-requests/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalSignature: 'TEMP_SIGNATURE', // TODO: Get from on-chain transaction
          adminAddress: publicKey.toString(),
        }),
      });

      if (response.ok) {
        toast.success('Pool request approved successfully!');
        fetchPoolRequests();
        fetchPools();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request: PoolRequest) => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setProcessingRequest(request.id);

    try {
      // TODO: Call on-chain reject_pool instruction here
      const response = await fetch(`/api/admin/pool-requests/${request.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectionSignature: 'TEMP_SIGNATURE', // TODO: Get from on-chain transaction
          adminAddress: publicKey.toString(),
          reason: 'Rejected by admin',
        }),
      });

      if (response.ok) {
        toast.success('Pool request rejected');
        fetchPoolRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingRequest(null);
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

        {/* Pool Requests */}
        <div className="mt-8 bg-black/30 border border-white/10 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Pool Requests</h2>
            <div className="text-sm text-white/60">
              {poolRequests.length} pending requests
            </div>
          </div>

          {poolRequests.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              No pending pool requests
            </div>
          ) : (
            <div className="space-y-4">
              {poolRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-black/50 border border-white/10 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold">
                          {request.tokenX.symbol}/{request.tokenY.symbol}
                        </h3>
                        <div className="px-3 py-1 text-xs font-bold uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          {request.status}
                        </div>
                      </div>
                      <div className="text-sm text-white/60 space-y-1">
                        <div>Fee: {request.fee / 100}%</div>
                        <div>Creator: {request.creator.slice(0, 8)}...{request.creator.slice(-8)}</div>
                        <div>Escrow X: {request.escrowXAddress?.slice(0, 8)}...{request.escrowXAddress?.slice(-8) || 'N/A'}</div>
                        <div>Escrow Y: {request.escrowYAddress?.slice(0, 8)}...{request.escrowYAddress?.slice(-8) || 'N/A'}</div>
                        <div>Requested: {new Date(request.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApproveRequest(request)}
                        disabled={processingRequest === request.id || !publicKey}
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingRequest === request.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        onClick={() => handleRejectRequest(request)}
                        disabled={processingRequest === request.id || !publicKey}
                        variant="destructive"
                      >
                        {processingRequest === request.id ? 'Processing...' : 'Reject'}
                      </Button>
                    </div>
                  </div>

                  {!publicKey && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4">
                      <p className="text-sm text-red-400">
                        <strong>Note:</strong> Connect your wallet to approve or reject requests
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
