import { NextResponse } from 'next/server';
import { rangeAvailability, nearestOpen } from '@/lib/booking';
import { todayBangkok } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const u = new URL(req.url);
  const from = u.searchParams.get('from') ?? todayBangkok();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return NextResponse.json({ error: 'bad_from' }, { status: 400 });
  const days = Math.min(62, Math.max(1, Number(u.searchParams.get('days') ?? 42)));
  const near = u.searchParams.get('near');
  return NextResponse.json(
    { today: todayBangkok(), days: rangeAvailability(from, days), nearest: near ? nearestOpen(near) : undefined },
    // A visitor may see a count up to 30 s old; truth is re-asserted under the write lock.
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  );
}
