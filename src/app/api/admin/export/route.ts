import { listOrders, toCsv } from '@/lib/admin';
import { guard } from '../guard';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const g = guard(req);
  if (g) return g;
  const u = new URL(req.url).searchParams;
  const rows = listOrders({ status: u.get('status') ?? undefined, date: u.get('date') ?? undefined, q: u.get('q') ?? undefined, range: (u.get('range') as 'past' | 'all') ?? undefined });
  return new Response(toCsv(rows), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="louvre-orders.csv"`, 'Cache-Control': 'no-store' },
  });
}
