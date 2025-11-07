/**
 * Pool Data Fetching Utilities
 * Fetch real-time pool state including reserves, LP supply, and statistics
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { getAccount } from '@solana/spl-token';
import { getAmmProgram, getConfigPDA, getLpMintPDA, derivePoolSeed } from '../anchor/setup';

export interface PoolConfig {
  seed: bigint;
  authority: PublicKey | null;
  mintX: PublicKey;
  mintY: PublicKey;
  fee: number;
  locked: boolean;
  whitelisted: boolean;
  configBump: number;
  lpBump: number;
}

export interface PoolState {
  config: PoolConfig;
  configAddress: PublicKey;
  vaultXAddress: PublicKey;
  vaultYAddress: PublicKey;
  vaultXBalance: bigint;
  vaultYBalance: bigint;
  lpMintAddress: PublicKey;
  lpSupply: bigint;
  poolPrice: number; // X tokens per Y token
  inversePrice: number; // Y tokens per X token
}

/**
 * Fetch complete pool state including reserves and LP supply
 *
 * @param connection - Solana connection
 * @param wallet - Anchor wallet
 * @param mintX - First token mint address
 * @param mintY - Second token mint address
 * @returns Complete pool state or null if pool doesn't exist
 */
export async function fetchPoolState(
  connection: Connection,
  wallet: AnchorWallet,
  mintX: PublicKey,
  mintY: PublicKey
): Promise<PoolState | null> {
  try {
    const program = getAmmProgram(connection, wallet);

    // Derive pool config PDA
    const seed = derivePoolSeed(mintX, mintY);
    const [configAddress] = getConfigPDA(seed);

    // Fetch pool config account
    const configAccount = await program.account.config.fetch(configAddress);

    // Derive LP mint PDA
    const [lpMintAddress] = getLpMintPDA(configAddress);

    // Get vault addresses (ATAs owned by config PDA)
    const vaultXAddress = await getAssociatedTokenAddress(
      configAccount.mintX,
      configAddress,
      true // allowOwnerOffCurve
    );

    const vaultYAddress = await getAssociatedTokenAddress(
      configAccount.mintY,
      configAddress,
      true
    );

    // Fetch vault token accounts
    const [vaultXAccount, vaultYAccount, lpMintAccount] = await Promise.all([
      getAccount(connection, vaultXAddress),
      getAccount(connection, vaultYAddress),
      connection.getTokenSupply(lpMintAddress),
    ]);

    // Calculate pool prices
    const vaultXBalance = vaultXAccount.amount;
    const vaultYBalance = vaultYAccount.amount;
    const poolPrice = Number(vaultXBalance) / Number(vaultYBalance);
    const inversePrice = Number(vaultYBalance) / Number(vaultXBalance);

    return {
      config: {
        seed: configAccount.seed,
        authority: configAccount.authority,
        mintX: configAccount.mintX,
        mintY: configAccount.mintY,
        fee: configAccount.fee,
        locked: configAccount.locked,
        whitelisted: configAccount.whitelisted,
        configBump: configAccount.configBump,
        lpBump: configAccount.lpBump,
      },
      configAddress,
      vaultXAddress,
      vaultYAddress,
      vaultXBalance,
      vaultYBalance,
      lpMintAddress,
      lpSupply: BigInt(lpMintAccount.value.amount),
      poolPrice,
      inversePrice,
    };
  } catch (error) {
    console.error('Error fetching pool state:', error);
    return null;
  }
}

/**
 * Get current pool price (X tokens per Y token)
 *
 * @param vaultXBalance - X token reserve
 * @param vaultYBalance - Y token reserve
 * @returns Pool price
 */
export function getPoolPrice(
  vaultXBalance: bigint,
  vaultYBalance: bigint
): number {
  if (vaultYBalance === 0n) return 0;
  return Number(vaultXBalance) / Number(vaultYBalance);
}

/**
 * Get inverse pool price (Y tokens per X token)
 *
 * @param vaultXBalance - X token reserve
 * @param vaultYBalance - Y token reserve
 * @returns Inverse pool price
 */
export function getInversePoolPrice(
  vaultXBalance: bigint,
  vaultYBalance: bigint
): number {
  if (vaultXBalance === 0n) return 0;
  return Number(vaultYBalance) / Number(vaultXBalance);
}

/**
 * Calculate Total Value Locked (TVL) in pool
 * Assumes both tokens have same decimal places
 *
 * @param vaultXBalance - X token reserve
 * @param vaultYBalance - Y token reserve
 * @param tokenXPriceUSD - Price of token X in USD
 * @param tokenYPriceUSD - Price of token Y in USD
 * @returns TVL in USD
 */
export function calculateTVL(
  vaultXBalance: bigint,
  vaultYBalance: bigint,
  tokenXPriceUSD: number,
  tokenYPriceUSD: number
): number {
  const decimals = 9;
  const factor = 10 ** decimals;

  const xValueUSD = (Number(vaultXBalance) / factor) * tokenXPriceUSD;
  const yValueUSD = (Number(vaultYBalance) / factor) * tokenYPriceUSD;

  return xValueUSD + yValueUSD;
}

/**
 * Check if pool is ready for swaps
 *
 * @param poolState - Pool state
 * @returns True if pool is ready
 */
export function isPoolReady(poolState: PoolState | null): boolean {
  if (!poolState) return false;
  if (poolState.config.locked) return false;
  if (poolState.vaultXBalance === 0n || poolState.vaultYBalance === 0n) return false;
  return true;
}

/**
 * Format pool reserves for display
 *
 * @param balance - Balance in base units
 * @param decimals - Token decimals
 * @returns Formatted string
 */
export function formatReserve(balance: bigint, decimals: number = 9): string {
  const factor = 10 ** decimals;
  const value = Number(balance) / factor;

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  } else {
    return value.toFixed(2);
  }
}

/**
 * Helper to get associated token address
 * Re-exported from @solana/spl-token for convenience
 */
async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve: boolean = false
): Promise<PublicKey> {
  const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
  return getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve);
}

/**
 * Calculate pool share percentage
 *
 * @param lpBalance - User's LP token balance
 * @param totalLpSupply - Total LP supply
 * @returns Share percentage
 */
export function calculatePoolShare(
  lpBalance: bigint,
  totalLpSupply: bigint
): number {
  if (totalLpSupply === 0n) return 0;
  return (Number(lpBalance) / Number(totalLpSupply)) * 100;
}
