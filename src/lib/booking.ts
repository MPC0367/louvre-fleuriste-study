import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ACTIVE, getDb } from './db';
import { addDays, todayBangkok } from './rules';
import {
  availabilityFrom,
  nearestOpenFrom,
  publicOrder,
  refFrom,
  rowFrom,
  type AdminOrder,
  type DayAvailability,
  type OrderError,
  type OrderInput,
  type PublicOrder,
} from './engine';

export { validate } from './engine';
export type { DayAvailability, OrderError, OrderInput, PublicOrder } from './engine';

/** The local server's store: SQLite in .data/. The rules themselves live in lib/engine.ts. */

function counts(date: string) {
  const rows = getDb()
    .prepare(`SELECT window_id AS w, COUNT(*) AS n FROM orders WHERE date = ? AND ${ACTIVE} GROUP BY window_id`)
    .all(date) as { w: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.w, Number(r.n)])) as Record<string, number>;
}

export function isBlocked(date: string) {
  return getDb().prepare('SELECT reason FROM blocked_dates WHERE date = ?').get(date) as { reason: string | null } | undefined;
}

export function dayAvailability(date: string): DayAvailability {
  return availabilityFrom(date, counts(date), !!isBlocked(date));
}

export function rangeAvailability(from: string, days: number) {
  const out: DayAvailability[] = [];
  for (let i = 0; i < days; i++) out.push(dayAvailability(addDays(from, i)));
  return out;
}

export function nearestOpen(date: string, n = 3) {
  return nearestOpenFrom(date, todayBangkok(), dayAvailability, n);
}

const hash = (t: string) => createHash('sha256').update(t).digest('hex');

/**
 * Creates an order. Capacity is recomputed inside an IMMEDIATE transaction — the write lock is
 * held before counting, so two customers can never both take the last place. A repeated
 * idempotency key returns the original order instead of a second one.
 */
export function createOrder(input: OrderInput): { ok: true; ref: string; token: string; replay: boolean } | { ok: false; error: OrderError } {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db.prepare('SELECT ref FROM orders WHERE idem_key = ?').get(input.idemKey) as { ref: string } | undefined;
    if (existing) {
      // Replay: the token cannot be recovered from its hash, so issue a fresh one for the same order.
      const token = randomBytes(18).toString('base64url');
      db.prepare('UPDATE orders SET token_hash = ? WHERE ref = ?').run(hash(token), existing.ref);
      db.exec('COMMIT');
      return { ok: true, ref: existing.ref, token, replay: true };
    }
    const a = dayAvailability(input.date);
    if (a.state === 'past' || a.state === 'lead' || a.state === 'horizon' || a.state === 'closed') {
      db.exec('ROLLBACK');
      return { ok: false, error: { code: a.state } };
    }
    if (a.left <= 0) {
      db.exec('ROLLBACK');
      return { ok: false, error: { code: 'day_full', nearest: nearestOpen(input.date) } };
    }
    const win = a.windows.find((w) => w.id === input.windowId);
    if (!win || win.left <= 0) {
      db.exec('ROLLBACK');
      return { ok: false, error: { code: 'slot_full', nearest: [], windows: a.windows } };
    }
    const token = randomBytes(18).toString('base64url');
    const row = rowFrom(input, refFrom(randomBytes(6)), hash(token), new Date());
    const cols = Object.keys(row) as (keyof typeof row)[];
    db.prepare(`INSERT INTO orders (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...cols.map((c) => row[c]));
    db.exec('COMMIT');
    return { ok: true, ref: row.ref, token, replay: false };
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {}
    throw e;
  }
}

/** Looks an order up for its owner. The token is compared against its hash in constant time. */
export function getOrder(ref: string, token: string): PublicOrder | null {
  if (!/^LF-[A-Z0-9]{6}$/.test(ref) || !token) return null;
  const row = getDb().prepare('SELECT * FROM orders WHERE ref = ? AND seed = 0').get(ref) as (AdminOrder & { token_hash: string }) | undefined;
  if (!row) return null;
  const a = Buffer.from(String(row.token_hash), 'hex');
  const b = Buffer.from(hash(token), 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return publicOrder(row);
}

// ── Rate limit (per process; enough for a local preview) ─────────────────
const hits = new Map<string, number[]>();
export function rateLimited(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > limit;
}
