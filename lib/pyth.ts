import { Connection, PublicKey } from '@solana/web3.js';
import { PriceServiceConnection } from '@pythnetwork/price-service-client';
import { prisma } from './db';

// Pyth price service connection
const PYTH_PRICE_SERVICE_URL =
  process.env.NEXT_PUBLIC_PYTH_NETWORK === 'mainnet-beta'
    ? 'https://hermes.pyth.network'
    : 'https://hermes-beta.pyth.network';

// SOL/USD feed ID for devnet
const SOL_USD_FEED_ID = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56fd';

// Token price data interface
export interface PriceData {
  price: number;
  expo: number;
  timestamp: number;
  feedId: string;
}

// Pyth price service client
let priceService: PriceServiceConnection;

export function getPriceService(): PriceServiceConnection {
  if (!priceService) {
    priceService = new PriceServiceConnection(PYTH_PRICE_SERVICE_URL, {
      logger: console,
    });
  }
  return priceService;
}

// Get SOL/USD price from Pyth
export async function getSolPrice(): Promise<PriceData | null> {
  try {
    const priceService = getPriceService();

    // Get latest price updates
    const priceUpdates = await priceService.getLatestPriceFeeds([SOL_USD_FEED_ID]);

    if (priceUpdates.length === 0) {
      throw new Error('No price updates received');
    }

    const priceUpdate = priceUpdates[0];
    const price = priceUpdate.getPriceNoOlderThan(60); // 60 seconds max age

    if (!price) {
      throw new Error('Price too old');
    }

    const priceData: PriceData = {
      price: price.price,
      expo: price.expo,
      timestamp: price.publishTime,
      feedId: SOL_USD_FEED_ID,
    };

    // Store in database
    await storePriceData(priceData);

    return priceData;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return null;
  }
}

// Store price data in database
async function storePriceData(priceData: PriceData): Promise<void> {
  try {
    await prisma.price.create({
      data: {
        feedId: priceData.feedId,
        price: priceData.price,
        expo: priceData.expo,
        timestamp: new Date(priceData.timestamp * 1000), // Convert to milliseconds
      },
    });
  } catch (error) {
    console.error('Error storing price data:', error);
    // Don't throw - price storage failure shouldn't break price fetching
  }
}

// Get historical price data
export async function getHistoricalPrices(feedId: string, limit: number = 100): Promise<PriceData[]> {
  try {
    const prices = await prisma.price.findMany({
      where: { feedId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return prices.map(p => ({
      price: p.price,
      expo: p.expo,
      timestamp: p.timestamp.getTime() / 1000, // Convert to seconds
      feedId: p.feedId,
    }));
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    return [];
  }
}

// Calculate price deviation for slippage protection
export function calculatePriceDeviation(
  currentPrice: PriceData,
  referencePrice: PriceData,
  maxDeviation: number = 0.05 // 5% default
): { deviation: number; withinBounds: boolean } {
  // Convert prices to same scale
  const currentValue = currentPrice.price * Math.pow(10, currentPrice.expo);
  const referenceValue = referencePrice.price * Math.pow(10, referencePrice.expo);

  const deviation = Math.abs(currentValue - referenceValue) / referenceValue;

  return {
    deviation,
    withinBounds: deviation <= maxDeviation,
  };
}

// Get formatted price string
export function formatPrice(priceData: PriceData): string {
  const value = priceData.price * Math.pow(10, priceData.expo);
  return value.toFixed(Math.abs(priceData.expo));
}

// Validate price freshness
export function isPriceFresh(priceData: PriceData, maxAgeSeconds: number = 300): boolean {
  const now = Date.now() / 1000;
  return (now - priceData.timestamp) <= maxAgeSeconds;
}

// Pyth oracle configuration
export const PYTH_CONFIG = {
  solUsdFeedId: SOL_USD_FEED_ID,
  maxPriceAge: 300, // 5 minutes
  defaultDeviation: 0.05, // 5%
};



