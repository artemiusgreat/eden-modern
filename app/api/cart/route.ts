import { NextRequest, NextResponse } from 'next/server';
import { getCart, addItem, updateItem, removeItem } from '@/lib/woo-cart';

export async function GET() {
  try {
    return NextResponse.json(await getCart());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, id, key, quantity } = await req.json();
    if (action === 'add') return NextResponse.json(await addItem(Number(id), Number(quantity) || 1));
    if (action === 'update') return NextResponse.json(await updateItem(String(key), Number(quantity)));
    if (action === 'remove') return NextResponse.json(await removeItem(String(key)));
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
