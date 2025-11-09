import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PublicKey } from '@solana/web3.js';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const body = await req.json();
    const { approvalSignature, adminAddress } = body;

    if (!approvalSignature || !adminAddress) {
      return NextResponse.json(
        { error: 'Missing approval signature or admin address' },
        { status: 400 }
      );
    }

    // Fetch the pool request
    const poolRequest = await prisma.poolRequest.findUnique({
      where: { id: requestId },
      include: {
        tokenX: true,
        tokenY: true,
      },
    });

    if (!poolRequest) {
      return NextResponse.json(
        { error: 'Pool request not found' },
        { status: 404 }
      );
    }

    if (poolRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Pool request already ${poolRequest.status}` },
        { status: 400 }
      );
    }

    // Update pool request status to approved
    const updatedRequest = await prisma.poolRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approvalSignature,
        approvedBy: adminAddress,
      },
    });

    // Derive LP mint address from config PDA
    const PROGRAM_ID = new PublicKey('HCmhN8r4Wdpe1MRy5R8NfLqQqKEDZVmvBV7JCz9aSdCb');
    const configPubkey = new PublicKey(poolRequest.configAddress);
    const [lpMintAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('lp'), configPubkey.toBuffer()],
      PROGRAM_ID
    );

    // Create the pool record in the Pool table
    const pool = await prisma.pool.create({
      data: {
        configAddress: poolRequest.configAddress,
        tokenXMint: poolRequest.tokenXMint,
        tokenYMint: poolRequest.tokenYMint,
        lpMintAddress: lpMintAddress.toString(),
        fee: poolRequest.fee,
        authority: poolRequest.creator, // Use creator as authority
        locked: false, // Unlock the pool upon approval
        whitelisted: true, // Whitelisted since admin approved
        escrowAddress: poolRequest.escrowAddress,
        creator: poolRequest.creator,
        creationSignature: poolRequest.creationSignature,
      },
      include: {
        tokenX: true,
        tokenY: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pool request approved successfully',
      data: {
        poolRequest: updatedRequest,
        pool,
      },
    });

  } catch (error) {
    console.error('Error approving pool request:', error);
    return NextResponse.json(
      { error: 'Failed to approve pool request' },
      { status: 500 }
    );
  }
}
