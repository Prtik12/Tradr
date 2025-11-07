/**
 * Price Safety Guards
 * Protect users from unfavorable swaps by comparing pool prices with oracle prices
 */

import { Connection } from '@solana/web3.js';
import { PoolState } from './pool-data';

export interface PriceDeviation {
  poolPrice: number;
  oraclePrice: number;
  deviation: number; // Percentage
  deviationBps: number; // Basis points
  allowed: boolean;
}

const DEFAULT_MAX_DEVIATION_BPS = 500; // 5% maximum deviation

/**
 * Calculate price deviation between pool and oracle
 *
 * @param poolPrice - Price from AMM pool
 * @param oraclePrice - Price from oracle (e.g., Pyth)
 * @returns Deviation percentage
 */
export function calculateDeviation(
  poolPrice: number,
  oraclePrice: number
): number {
  if (oraclePrice === 0) return 0;
  return Math.abs((poolPrice - oraclePrice) / oraclePrice) * 100;
}

/**
 * Check if price deviation is within acceptable limits
 *
 * @param poolPrice - Price from AMM pool
 * @param oraclePrice - Price from oracle
 * @param maxDeviationBps - Maximum allowed deviation in basis points (default 500 = 5%)
 * @returns Price deviation details
 */
export function checkPriceDeviation(
  poolPrice: number,
  oraclePrice: number,
  maxDeviationBps: number = DEFAULT_MAX_DEVIATION_BPS
): PriceDeviation {
  const deviation = calculateDeviation(poolPrice, oraclePrice);
  const deviationBps = Math.round(deviation * 100); // Convert to basis points
  const allowed = deviationBps <= maxDeviationBps;

  return {
    poolPrice,
    oraclePrice,
    deviation,
    deviationBps,
    allowed,
  };
}

/**
 * Validate swap price against oracle
 *
 * @param poolState - Current pool state
 * @param oraclePrice - Oracle price (SOL/USD or token/USD)
 * @param maxDeviationBps - Maximum allowed deviation
 * @returns True if swap price is acceptable
 */
export function validateSwapPrice(
  poolState: PoolState,
  oraclePrice: number,
  maxDeviationBps: number = DEFAULT_MAX_DEVIATION_BPS
): boolean {
  if (!poolState) return false;
  if (oraclePrice <= 0) return false; // No oracle price available, skip validation

  const { poolPrice } = poolState;
  const check = checkPriceDeviation(poolPrice, oraclePrice, maxDeviationBps);

  return check.allowed;
}

/**
 * Get warning message for price deviation
 *
 * @param deviation - Price deviation details
 * @returns Warning message or null if no warning
 */
export function getDeviationWarning(deviation: PriceDeviation): string | null {
  if (deviation.allowed) return null;

  return `Pool price deviates ${deviation.deviation.toFixed(2)}% from oracle price. ` +
    `This may indicate unfavorable swap conditions or low liquidity.`;
}

/**
 * Format price deviation for display
 *
 * @param deviation - Deviation percentage
 * @returns Formatted string
 */
export function formatDeviation(deviation: number): string {
  return `${deviation.toFixed(2)}%`;
}

/**
 * Check if pool price is within a reasonable range
 * This is a sanity check to prevent obvious manipulation
 *
 * @param poolPrice - Pool price
 * @param oraclePrice - Oracle price
 * @returns True if price seems reasonable
 */
export function isPriceReasonable(
  poolPrice: number,
  oraclePrice: number
): boolean {
  if (poolPrice <= 0 || oraclePrice <= 0) return false;

  // Price shouldn't be more than 10x or less than 0.1x the oracle price
  const ratio = poolPrice / oraclePrice;
  return ratio >= 0.1 && ratio <= 10;
}

/**
 * Get price health status
 *
 * @param deviation - Price deviation details
 * @returns Health status: 'healthy' | 'warning' | 'danger'
 */
export function getPriceHealth(deviation: PriceDeviation): 'healthy' | 'warning' | 'danger' {
  if (deviation.deviationBps <= 100) return 'healthy'; // <= 1%
  if (deviation.deviationBps <= 300) return 'warning'; // <= 3%
  return 'danger'; // > 3%
}

/**
 * Calculate expected vs actual output deviation
 * Compare what user expects vs what they'll actually get
 *
 * @param expectedOutput - Output calculated from oracle price
 * @param actualOutput - Output calculated from pool reserves
 * @returns Deviation percentage
 */
export function calculateOutputDeviation(
  expectedOutput: bigint,
  actualOutput: bigint
): number {
  if (expectedOutput === 0n) return 0;
  const expected = Number(expectedOutput);
  const actual = Number(actualOutput);
  return Math.abs((actual - expected) / expected) * 100;
}

/**
 * Validate output deviation is acceptable
 *
 * @param expectedOutput - Expected output from oracle price
 * @param actualOutput - Actual output from pool
 * @param maxDeviationBps - Maximum allowed deviation
 * @returns True if deviation is acceptable
 */
export function validateOutputDeviation(
  expectedOutput: bigint,
  actualOutput: bigint,
  maxDeviationBps: number = DEFAULT_MAX_DEVIATION_BPS
): boolean {
  const deviation = calculateOutputDeviation(expectedOutput, actualOutput);
  const deviationBps = Math.round(deviation * 100);
  return deviationBps <= maxDeviationBps;
}

/**
 * Configuration for price guards
 */
export interface PriceGuardConfig {
  maxDeviationBps: number;
  enableOracleCheck: boolean;
  enableOutputCheck: boolean;
  warnOnHighDeviation: boolean;
}

export const DEFAULT_PRICE_GUARD_CONFIG: PriceGuardConfig = {
  maxDeviationBps: 500, // 5%
  enableOracleCheck: true,
  enableOutputCheck: true,
  warnOnHighDeviation: true,
};

/**
 * Comprehensive price validation
 *
 * @param poolState - Pool state
 * @param oraclePrice - Oracle price
 * @param config - Price guard configuration
 * @returns Validation result with details
 */
export function validatePriceWithGuards(
  poolState: PoolState,
  oraclePrice: number,
  config: PriceGuardConfig = DEFAULT_PRICE_GUARD_CONFIG
): {
  valid: boolean;
  deviation: PriceDeviation | null;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!config.enableOracleCheck || oraclePrice <= 0) {
    return { valid: true, deviation: null, warnings };
  }

  const deviation = checkPriceDeviation(
    poolState.poolPrice,
    oraclePrice,
    config.maxDeviationBps
  );

  if (!deviation.allowed) {
    warnings.push(getDeviationWarning(deviation)!);
    return { valid: false, deviation, warnings };
  }

  if (config.warnOnHighDeviation && deviation.deviationBps > 300) {
    warnings.push(`Price deviation is ${formatDeviation(deviation.deviation)}`);
  }

  if (!isPriceReasonable(poolState.poolPrice, oraclePrice)) {
    warnings.push('Pool price appears unreasonable compared to oracle');
    return { valid: false, deviation, warnings };
  }

  return { valid: true, deviation, warnings };
}
