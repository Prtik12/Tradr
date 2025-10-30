import { NextResponse } from 'next/server';
import { getSolPrice, formatPrice, isPriceFresh } from '@/lib/pyth';

export async function GET() {
  try {
    const priceData = await getSolPrice();

    if (!priceData) {
      // Return mock data as fallback for development
      return NextResponse.json({
        price: 12500000000, // $125.00 in Pyth format
        expo: -8,
        conf: 5000000, // $0.05 confidence
        displayPrice: 125.0,
        displayConf: 0.05,
        timestamp: Date.now(),
        mock: true,
      });
    }

    // Check if price is fresh
    if (!isPriceFresh(priceData)) {
      return NextResponse.json(
        { error: 'Price data is too old' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      price: priceData.price,
      expo: priceData.expo,
      displayPrice: parseFloat(formatPrice(priceData)),
      timestamp: priceData.timestamp,
      feedId: priceData.feedId,
    });

  } catch (error) {
    console.error('Error fetching SOL/USD price:', error);

    // Return mock data as fallback for development
    return NextResponse.json({
      price: 12500000000, // $125.00 in Pyth format
      expo: -8,
      conf: 5000000, // $0.05 confidence
      displayPrice: 125.0,
      displayConf: 0.05,
      timestamp: Date.now(),
      mock: true,
    });
  }
}
