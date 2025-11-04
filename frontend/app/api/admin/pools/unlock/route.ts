import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { poolId, signature } = body;

    if (!poolId || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update pool status
    const pool = await prisma.pool.update({
      where: { id: poolId },
      data: {
        locked: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pool unlocked successfully',
      pool,
    });

  } catch (error) {
    console.error('Error unlocking pool:', error);
    return NextResponse.json(
      { error: 'Failed to unlock pool' },
      { status: 500 }
    );
  }
}



