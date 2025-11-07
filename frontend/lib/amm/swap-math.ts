/**
 * AMM Swap Mathematics
 * Implements constant product formula (x * y = k) with fees
 */

const DECIMALS = 9;
const SCALE_FACTOR = 10 ** DECIMALS;
const BPS_DENOMINATOR = 10000; // Basis points denominator

export interface SwapQuote {
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  effectivePrice: number;
  minimumOutput: bigint;
  fee: bigint;
}

/**
 * Calculate swap output using constant product formula
 * Formula: output = (outputReserve * inputAmount * (1 - fee)) / (inputReserve + inputAmount * (1 - fee))
 *
 * @param inputAmount - Amount of input tokens (in base units)
 * @param inputReserve - Current reserve of input token in pool
 * @param outputReserve - Current reserve of output token in pool
 * @param feeBps - Fee in basis points (e.g., 300 = 3%)
 * @returns Output amount after fees and slippage
 */
export function calculateSwapOutput(
  inputAmount: bigint,
  inputReserve: bigint,
  outputReserve: bigint,
  feeBps: number
): bigint {
  if (inputAmount === 0n) return 0n;
  if (inputReserve === 0n || outputReserve === 0n) return 0n;

  // Calculate input amount after fee
  const feeMultiplier = BigInt(BPS_DENOMINATOR - feeBps);
  const inputWithFee = (inputAmount * feeMultiplier) / BigInt(BPS_DENOMINATOR);

  // Constant product formula: (x + dx) * (y - dy) = k
  // Solving for dy: dy = (y * dx) / (x + dx)
  const numerator = outputReserve * inputWithFee;
  const denominator = inputReserve + inputWithFee;

  return numerator / denominator;
}

/**
 * Calculate price impact of a swap
 * Price impact = (inputAmount / inputReserve) * 100
 *
 * @param inputAmount - Amount of input tokens
 * @param inputReserve - Current reserve of input token
 * @returns Price impact as a percentage
 */
export function calculatePriceImpact(
  inputAmount: bigint,
  inputReserve: bigint
): number {
  if (inputReserve === 0n) return 0;

  const impact = (Number(inputAmount) / Number(inputReserve)) * 100;
  return Math.min(impact, 100); // Cap at 100%
}

/**
 * Calculate minimum output with slippage tolerance
 *
 * @param outputAmount - Expected output amount
 * @param slippageBps - Slippage tolerance in basis points (e.g., 50 = 0.5%)
 * @returns Minimum output amount accounting for slippage
 */
export function calculateMinOutput(
  outputAmount: bigint,
  slippageBps: number
): bigint {
  const slippageMultiplier = BigInt(BPS_DENOMINATOR - slippageBps);
  return (outputAmount * slippageMultiplier) / BigInt(BPS_DENOMINATOR);
}

/**
 * Calculate effective price of the swap
 * Effective price = outputAmount / inputAmount
 *
 * @param inputAmount - Amount of input tokens
 * @param outputAmount - Amount of output tokens
 * @returns Price as a decimal number
 */
export function getEffectivePrice(
  inputAmount: bigint,
  outputAmount: bigint
): number {
  if (inputAmount === 0n) return 0;
  return Number(outputAmount) / Number(inputAmount);
}

/**
 * Calculate fee amount for a swap
 *
 * @param inputAmount - Amount of input tokens
 * @param feeBps - Fee in basis points
 * @returns Fee amount
 */
export function calculateFeeAmount(
  inputAmount: bigint,
  feeBps: number
): bigint {
  return (inputAmount * BigInt(feeBps)) / BigInt(BPS_DENOMINATOR);
}

/**
 * Get complete swap quote with all calculations
 *
 * @param inputAmount - Input amount in base units
 * @param inputReserve - Input token reserve
 * @param outputReserve - Output token reserve
 * @param feeBps - Fee in basis points
 * @param slippageBps - Slippage tolerance in basis points
 * @returns Complete swap quote
 */
export function getSwapQuote(
  inputAmount: bigint,
  inputReserve: bigint,
  outputReserve: bigint,
  feeBps: number,
  slippageBps: number
): SwapQuote {
  const outputAmount = calculateSwapOutput(
    inputAmount,
    inputReserve,
    outputReserve,
    feeBps
  );

  const priceImpact = calculatePriceImpact(inputAmount, inputReserve);
  const effectivePrice = getEffectivePrice(inputAmount, outputAmount);
  const minimumOutput = calculateMinOutput(outputAmount, slippageBps);
  const fee = calculateFeeAmount(inputAmount, feeBps);

  return {
    inputAmount,
    outputAmount,
    priceImpact,
    effectivePrice,
    minimumOutput,
    fee,
  };
}

/**
 * Convert human-readable amount to base units (with decimals)
 *
 * @param amount - Amount as decimal number
 * @param decimals - Token decimals (default 9)
 * @returns Amount in base units
 */
export function toBaseUnits(amount: number, decimals: number = DECIMALS): bigint {
  const factor = 10 ** decimals;
  return BigInt(Math.floor(amount * factor));
}

/**
 * Convert base units to human-readable amount
 *
 * @param amount - Amount in base units
 * @param decimals - Token decimals (default 9)
 * @returns Amount as decimal number
 */
export function fromBaseUnits(amount: bigint, decimals: number = DECIMALS): number {
  const factor = 10 ** decimals;
  return Number(amount) / factor;
}

/**
 * Check if price impact is considered high (>5%)
 *
 * @param priceImpact - Price impact percentage
 * @returns True if price impact is high
 */
export function isHighPriceImpact(priceImpact: number): boolean {
  return priceImpact > 5;
}

/**
 * Format price impact for display
 *
 * @param priceImpact - Price impact percentage
 * @returns Formatted string with warning if high
 */
export function formatPriceImpact(priceImpact: number): string {
  const formatted = priceImpact.toFixed(2);
  return isHighPriceImpact(priceImpact)
    ? `${formatted}% ⚠️`
    : `${formatted}%`;
}
