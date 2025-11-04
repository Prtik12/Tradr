import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      tokenMint,
      initialTokenAmount,
      initialSolAmount,
      creator,
      signature,
      locked = true, // Always start locked
    } = body;

    // Validate required fields
    if (!tokenMint || !creator || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure SOL token exists (should be seeded, but double-check)
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    await prisma.token.upsert({
      where: { mintAddress: SOL_MINT },
      update: {},
      create: {
        mintAddress: SOL_MINT,
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
        supply: '0',
        imageUrl: null,
        creator: 'SYSTEM',
        signature: 'NATIVE_TOKEN',
        whitelisted: true,
      },
    });

    // Check if token exists
    const token = await prisma.token.findUnique({
      where: { mintAddress: tokenMint },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found in registry. Please create your token first.' },
        { status: 400 }
      );
    }

    // Create pool record
    const pool = await prisma.pool.create({
      data: {
        configAddress: '', // Will be updated when pool is initialized on-chain
        tokenXMint: 'So11111111111111111111111111111111111111112', // SOL
        tokenYMint: tokenMint,
        lpMintAddress: '', // Will be set when pool is created
        fee: 300, // 3%
        authority: creator,
        locked,
        creator,
        creationSignature: signature,
      },
      include: {
        tokenX: true,
        tokenY: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pool request submitted successfully',
      data: pool,
    });

  } catch (error) {
    console.error('Error creating pool request:', error);
    return NextResponse.json(
      { error: 'Failed to create pool request' },
      { status: 500 }
    );
  }
}
