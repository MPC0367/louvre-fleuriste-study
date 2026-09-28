import { NextResponse } from 'next/server';
import { loadRange } from '@/lib/admin';
import { todayBangkok } from '@/lib/rules';
import { guard } from '../guard';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const g = guard(req);
  if (g) return g;
  const u = new URL(req.url).searchParams;
  const from = u.get('from') ?? todayBangkok();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return NextResponse.json({ error: 'bad_from' }, { status: 400 });
  const days = Math.min(62, Math.max(1, Number(u.get('days') ?? 35)));
  return NextResponse.json({ today: todayBangkok(), days: loadRange(from, days) }, { headers: { 'Cache-Control': 'no-store' } });
}
