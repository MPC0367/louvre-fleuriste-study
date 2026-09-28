import { NextResponse } from 'next/server';
import { updateOrder } from '@/lib/admin';
import { guard } from '../../guard';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const g = guard(req, true);
  if (g) return g;
  const { ref } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const ok = updateOrder(ref, { status: body.status, payment: body.payment, internal_notes: body.internal_notes });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'invalid' }, { status: 422 });
}
