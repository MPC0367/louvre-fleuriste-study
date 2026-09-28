import { NextResponse } from 'next/server';
import { adminAllowed } from '@/lib/admin';

/** Refuses when the demo admin is off, and refuses writes from another origin. */
export function guard(req: Request, write = false) {
  if (!adminAllowed()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (write) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (!origin || !host || new URL(origin).host !== host) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}
