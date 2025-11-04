import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

/**
 * Fetch user's LP token balance for a specific pool
 */
export async function fetchLPBalance(
  connection: Connection,
  wallet: PublicKey,
  lpMint: PublicKey
): Promise<bigint> {
  try {
    const lpAta = await getAssociatedTokenAddress(lpMint, wallet);
    const accountInfo = await connection.getAccountInfo(lpAta);

    if (!accountInfo) {
      return BigInt(0);
    }

    const tokenAccount = await getAccount(connection, lpAta);
    return tokenAccount.amount;
  } catch (error) {
    return BigInt(0);
  }
}

/**
 * Calculate withdrawable amounts (X and Y) from LP tokens
 * Uses the pool's current reserves and LP supply
 */
export function calculateWithdrawAmounts(
  lpAmount: bigint,
  lpTotalSupply: bigint,
  vaultXBalance: bigint,
  vaultYBalance: bigint
): { amountX: bigint; amountY: bigint } {
  if (lpTotalSupply === BigInt(0)) {
    return { amountX: BigInt(0), amountY: BigInt(0) };
  }

  // Calculate proportional share
  // amountX = (lpAmount * vaultXBalance) / lpTotalSupply
  const amountX = (lpAmount * vaultXBalance) / lpTotalSupply;
  const amountY = (lpAmount * vaultYBalance) / lpTotalSupply;

  return { amountX, amountY };
}

/**
 * Calculate user's share percentage of the pool
 */
export function calculateLPShare(
  lpAmount: bigint,
  lpTotalSupply: bigint
): number {
  if (lpTotalSupply === BigInt(0)) {
    return 0;
  }

  const sharePercent = (Number(lpAmount) / Number(lpTotalSupply)) * 100;
  return Math.min(sharePercent, 100); // Cap at 100%
}

/**
 * Format LP share percentage for display
 */
export function formatLPShare(sharePercent: number): string {
  if (sharePercent < 0.01 && sharePercent > 0) {
    return '<0.01%';
  }
  return `${sharePercent.toFixed(2)}%`;
}

/**
 * Format LP token amount (9 decimals) for display
 */
export function formatLPAmount(amount: bigint, decimals: number = 9): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  const fractionalString = fractionalPart
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, ''); // Remove trailing zeros

  if (fractionalString === '') {
    return integerPart.toString();
  }

  return `${integerPart}.${fractionalString}`;
}

/**
 * Parse LP token amount from string input
 */
export function parseLPAmount(amountString: string, decimals: number = 9): bigint {
  const parts = amountString.split('.');
  const integerPart = parts[0] || '0';
  const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);

  const combined = integerPart + fractionalPart;
  return BigInt(combined);
}

/**
 * Fetch LP token metadata from chain
 */
export async function fetchLPMintInfo(
  connection: Connection,
  lpMint: PublicKey
): Promise<{ supply: bigint; decimals: number }> {
  const mintInfo = await connection.getParsedAccountInfo(lpMint);

  if (!mintInfo.value || !('parsed' in mintInfo.value.data)) {
    throw new Error('Invalid LP mint address');
  }

  const parsed = mintInfo.value.data.parsed;
  return {
    supply: BigInt(parsed.info.supply),
    decimals: parsed.info.decimals,
  };
}

/**
 * Get all LP positions for a wallet
 */
export async function getAllLPPositions(
  connection: Connection,
  wallet: PublicKey,
  lpMints: PublicKey[]
): Promise<
  Array<{
    lpMint: PublicKey;
    balance: bigint;
    share: number;
  }>
> {
  const positions = await Promise.all(
    lpMints.map(async (lpMint) => {
      try {
        const balance = await fetchLPBalance(connection, wallet, lpMint);
        const mintInfo = await fetchLPMintInfo(connection, lpMint);
        const share = calculateLPShare(balance, mintInfo.supply);

        return {
          lpMint,
          balance,
          share,
        };
      } catch (error) {
        return {
          lpMint,
          balance: BigInt(0),
          share: 0,
        };
      }
    })
  );

  // Filter out positions with zero balance
  return positions.filter((p) => p.balance > BigInt(0));
}
