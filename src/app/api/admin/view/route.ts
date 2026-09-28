import { NextResponse } from 'next/server';
import { getAdminOrder, listOrders, loadRange, summary } from '@/lib/admin';
import { todayBangkok } from '@/lib/rules';
import { guard } from '../guard';

export const dynamic = 'force-dynamic';

/** Everything the orders screen shows, for one set of filters (the same answer lib/demo-store.ts gives). */
export function GET(req: Request) {
  const g = guard(req);
  if (g) return g;
  const u = new URL(req.url).searchParams;
  const get = (k: string) => u.get(k) || undefined;
  const today = todayBangkok();
  const order = get('order');
  return NextResponse.json(
    {
      today,
      orders: listOrders({ status: get('status'), date: get('date'), q: get('q'), range: get('range') as 'past' | 'upcoming' | 'all' | undefined }),
      summary: summary(),
      strip: loadRange(today, 14),
      open: order ? getAdminOrder(order) ?? null : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
