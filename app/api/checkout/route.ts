import { NextRequest, NextResponse } from 'next/server';
import { getCheckout, placeOrder } from '@/lib/woo-cart';

function toErrorResponse(e: unknown) {
  const err = e as { status?: number; message?: string; body?: unknown };
  const status = typeof err.status === 'number' ? err.status : 502;
  return NextResponse.json(
    { error: err.message ?? 'Checkout request failed', details: err.body ?? null },
    { status },
  );
}

export async function GET() {
  try {
    return NextResponse.json(await getCheckout());
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(await placeOrder(await req.json()));
  } catch (e) {
    return toErrorResponse(e);
  }
}
