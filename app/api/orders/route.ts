import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get('user');
    const marketAddress = searchParams.get('market');
    const status = searchParams.get('status');

    const where: any = {};
    if (userAddress) where.userAddress = userAddress;
    if (marketAddress) where.marketAddress = marketAddress;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      orders,
      total: orders.length,
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orderId,
      userAddress,
      marketAddress,
      poolAddress,
      side,
      orderType,
      price,
      quantity,
      signature,
    } = body;

    // Validate required fields
    if (!orderId || !userAddress || !marketAddress || !poolAddress || !side || !orderType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order record
    const order = await prisma.order.create({
      data: {
        orderId,
        userAddress,
        marketAddress,
        poolAddress,
        side,
        orderType,
        price: price || 0,
        quantity,
        filledQty: 0,
        status: 'open',
        signature,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      order,
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}



