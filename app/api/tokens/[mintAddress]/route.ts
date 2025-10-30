import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { mintAddress: string } }
) {
  try {
    const { mintAddress } = params;

    const token = await prisma.token.findUnique({
      where: { mintAddress },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found in registry' },
        { status: 404 }
      );
    }

    return NextResponse.json(token);

  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token' },
      { status: 500 }
    );
  }
}
