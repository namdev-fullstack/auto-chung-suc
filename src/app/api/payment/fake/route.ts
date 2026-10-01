import { NextRequest, NextResponse } from 'next/server';
import { processPayment, getOrderById } from '@/lib/orders';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const paymentTransactionId = `FAKE_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const paymentContent = `Fake payment for order ${orderId}`;

    await processPayment(orderId, paymentTransactionId, paymentContent, order.amount);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
