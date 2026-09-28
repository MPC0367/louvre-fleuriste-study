import { NextResponse } from 'next/server';
import { createOrder, rateLimited, validate } from '@/lib/booking';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Same-origin only: a form on another site cannot post orders here.
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(`order:${ip}`)) return NextResponse.json({ error: { code: 'rate' } }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: 'invalid', fields: [] } }, { status: 400 });
  }
  const { input, fields } = validate(body);
  if (!input) return NextResponse.json({ error: { code: 'invalid', fields } }, { status: 422 });

  const r = createOrder(input);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
  return NextResponse.json({ ref: r.ref, token: r.token, replay: r.replay }, { status: r.replay ? 200 : 201 });
}
