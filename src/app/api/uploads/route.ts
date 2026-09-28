import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDb, UPLOAD_DIR } from '@/lib/db';
import { rateLimited } from '@/lib/booking';

export const dynamic = 'force-dynamic';
const MAX = 8 * 1024 * 1024;

/** Identify by content, not by the name or type the browser claims. */
function sniff(b: Buffer): { mime: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  const brand = b.subarray(8, 12).toString();
  if (b.subarray(4, 8).toString() === 'ftyp' && ['heic', 'heix', 'mif1', 'msf1', 'hevc'].includes(brand)) return { mime: 'image/heic', ext: 'heic' };
  return null;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(`upload:${ip}`, 12)) return NextResponse.json({ error: 'rate' }, { status: 429 });
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX + 64 * 1024) return NextResponse.json({ error: 'too_big' }, { status: 413 });
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: 'bad_form' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: 'too_big' }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return NextResponse.json({ error: 'type' }, { status: 415 });
  const id = randomBytes(12).toString('hex');
  // Stored outside public/: customer pictures are never served back to the web.
  const name = `${id}.${kind.ext}`;
  writeFileSync(join(UPLOAD_DIR, name), buf);
  getDb().prepare('INSERT INTO uploads (id, file, mime, size, created_iso) VALUES (?, ?, ?, ?, ?)').run(id, name, kind.mime, buf.length, new Date().toISOString());
  return NextResponse.json({ id }, { status: 201 });
}
