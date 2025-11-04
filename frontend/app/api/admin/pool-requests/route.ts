import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // Filter by status: pending, approved, rejected

    // Build filter
    const where = status ? { status } : {};

    // Fetch pool requests with token relationships
    const poolRequests = await prisma.poolRequest.findMany({
      where,
      include: {
        tokenX: true,
        tokenY: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: poolRequests,
    });

  } catch (error) {
    console.error('Error fetching pool requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pool requests' },
      { status: 500 }
    );
  }
}
