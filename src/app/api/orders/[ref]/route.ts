import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/booking';

export const dynamic = 'force-dynamic';

/** The customer's view of their order, with the token from their confirmation link. */
export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const o = getOrder(ref, new URL(req.url).searchParams.get('t') ?? '');
  return o ? NextResponse.json(o, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
}
