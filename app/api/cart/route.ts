import { NextRequest, NextResponse } from 'next/server';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  updateCustomer,
  selectShippingRate,
} from '@/lib/woo-cart';

export async function GET() {
  try {
    return NextResponse.json(await getCart());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, id, key, quantity, billing_address, shipping_address, package_id, rate_id } =
      await req.json();
    if (action === 'add') return NextResponse.json(await addItem(Number(id), Number(quantity) || 1));
    if (action === 'update') return NextResponse.json(await updateItem(String(key), Number(quantity)));
    if (action === 'remove') return NextResponse.json(await removeItem(String(key)));
    if (action === 'update-customer')
      return NextResponse.json(await updateCustomer(billing_address, shipping_address));
    if (action === 'select-shipping-rate')
      return NextResponse.json(await selectShippingRate(Number(package_id), String(rate_id)));
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
