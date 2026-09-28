import { NextResponse } from 'next/server';
import { setBlocked } from '@/lib/admin';
import { guard } from '../guard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const g = guard(req, true);
  if (g) return g;
  const body = (await req.json().catch(() => ({}))) as { date?: string; blocked?: boolean; reason?: string };
  const ok = setBlocked(String(body.date), Boolean(body.blocked), body.reason?.slice(0, 120));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'invalid' }, { status: 422 });
}
