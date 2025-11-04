import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Update order status to cancelled
    const order = await prisma.order.update({
      where: { orderId },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order,
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}



