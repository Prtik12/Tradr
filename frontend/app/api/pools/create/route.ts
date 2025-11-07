import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      poolSeed,
      configAddress,
      escrowAddress,
      tokenMint,
      amountX,
      amountY,
      creator,
      signature,
    } = body;

    // Validate required fields
    if (!poolSeed || !configAddress || !escrowAddress || !tokenMint || !amountX || !amountY || !creator || !signature) {
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

    // Create pool request record (pending admin approval)
    const poolRequest = await prisma.poolRequest.create({
      data: {
        poolSeed,
        configAddress,
        escrowAddress,
        tokenXMint: SOL_MINT, // SOL
        tokenYMint: tokenMint,
        amountX,
        amountY,
        fee: 300, // 3%
        creator,
        status: 'pending',
        creationSignature: signature,
      },
      include: {
        tokenX: true,
        tokenY: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pool request submitted successfully and awaiting admin approval',
      data: poolRequest,
    });

  } catch (error) {
    console.error('Error creating pool request:', error);
    return NextResponse.json(
      { error: 'Failed to create pool request' },
      { status: 500 }
    );
  }
}
