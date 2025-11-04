import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const body = await req.json();
    const { rejectionSignature, adminAddress, reason } = body;

    if (!rejectionSignature || !adminAddress) {
      return NextResponse.json(
        { error: 'Missing rejection signature or admin address' },
        { status: 400 }
      );
    }

    // Fetch the pool request
    const poolRequest = await prisma.poolRequest.findUnique({
      where: { id: requestId },
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

    // Update pool request status to rejected
    const updatedRequest = await prisma.poolRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        rejectionSignature,
        rejectedAt: new Date(),
        rejectedBy: adminAddress,
        rejectionReason: reason || 'No reason provided',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pool request rejected successfully',
      data: updatedRequest,
    });

  } catch (error) {
    console.error('Error rejecting pool request:', error);
    return NextResponse.json(
      { error: 'Failed to reject pool request' },
      { status: 500 }
    );
  }
}
