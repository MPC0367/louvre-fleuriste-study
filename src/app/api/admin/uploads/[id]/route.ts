import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDb, UPLOAD_DIR } from '@/lib/db';
import { guard } from '../../guard';

export const dynamic = 'force-dynamic';

/** Customer reference pictures are served to the admin only, never from public/. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = guard(req);
  if (g) return g;
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response('Not found', { status: 404 });
  const row = getDb().prepare('SELECT file, mime FROM uploads WHERE id = ?').get(id) as { file: string; mime: string } | undefined;
  if (!row) return new Response('Not found', { status: 404 });
  try {
    return new Response(readFileSync(join(UPLOAD_DIR, row.file)), { headers: { 'Content-Type': row.mime, 'Cache-Control': 'private, no-store' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
