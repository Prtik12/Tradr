import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      mintAddress,
      name,
      symbol,
      decimals,
      supply,
      imageUrl,
      creator,
      signature,
    } = body;

    // Validate required fields
    if (!mintAddress || !name || !symbol || !creator) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if token already exists
    const existingToken = await prisma.token.findUnique({
      where: { mintAddress },
    });

    if (existingToken) {
      return NextResponse.json({
        success: true,
        message: 'Token already exists',
        data: existingToken,
      });
    }

    // Validate decimals (must be 9)
    if (decimals !== 9) {
      return NextResponse.json(
        { error: 'Token must have 9 decimals' },
        { status: 400 }
      );
    }

    // Create token record
    const token = await prisma.token.create({
      data: {
        mintAddress,
        name,
        symbol,
        decimals,
        supply: supply || '0',
        imageUrl: imageUrl || null,
        creator,
        signature,
        whitelisted: false, // Tokens start not whitelisted
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Token metadata stored successfully',
      data: token,
    });

  } catch (error) {
    console.error('Error storing token metadata:', error);
    return NextResponse.json(
      { error: 'Failed to store token metadata' },
      { status: 500 }
    );
  }
}
