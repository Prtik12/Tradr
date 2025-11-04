import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
        approvedAt: new Date(),
        approvedBy: adminAddress,
      },
    });

    // Create the pool record in the Pool table
    const pool = await prisma.pool.create({
      data: {
        configAddress: poolRequest.configAddress || '',
        tokenXMint: poolRequest.tokenXMint,
        tokenYMint: poolRequest.tokenYMint,
        lpMintAddress: poolRequest.lpMintAddress || '',
        fee: poolRequest.fee,
        authority: poolRequest.authority || poolRequest.creator,
        locked: false, // Unlock the pool upon approval
        whitelisted: false,
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
