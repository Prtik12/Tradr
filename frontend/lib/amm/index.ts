/**
 * AMM Utilities
 * Centralized exports for swap calculations, pool data, and price guards
 */

// Swap Math
export {
  calculateSwapOutput,
  calculatePriceImpact,
  calculateMinOutput,
  getEffectivePrice,
  calculateFeeAmount,
  getSwapQuote,
  toBaseUnits,
  fromBaseUnits,
  isHighPriceImpact,
  formatPriceImpact,
  type SwapQuote,
} from './swap-math';

// Pool Data
export {
  fetchPoolState,
  getPoolPrice,
  getInversePoolPrice,
  calculateTVL,
  isPoolReady,
  formatReserve,
  calculatePoolShare,
  type PoolConfig,
  type PoolState,
} from './pool-data';

// Price Guards
export {
  calculateDeviation,
  checkPriceDeviation,
  validateSwapPrice,
  getDeviationWarning,
  formatDeviation,
  isPriceReasonable,
  getPriceHealth,
  calculateOutputDeviation,
  validateOutputDeviation,
  validatePriceWithGuards,
  DEFAULT_PRICE_GUARD_CONFIG,
  type PriceDeviation,
  type PriceGuardConfig,
} from './price-guards';
