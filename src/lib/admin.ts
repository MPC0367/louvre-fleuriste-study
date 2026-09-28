import { ACTIVE, getDb } from './db';
import { addDays, todayBangkok } from './rules';
import { cleanPatch, filterOrders, loadFrom, summarize, type AdminOrder, type DayLoad, type OrderFilter } from './engine';

export { STATUSES, PAYMENTS, toCsv } from './engine';
export type { AdminOrder, DayLoad, OrderFilter, Status, Payment, Summary } from './engine';

export { adminAllowed } from './admin-guard';

/** The demo admin's store on the local server. Filtering, sorting and summaries are the shared ones in lib/engine.ts; this file only reads and writes SQLite. */

const allRows = () => getDb().prepare('SELECT * FROM orders').all() as unknown as AdminOrder[];

export function listOrders(f: OrderFilter): AdminOrder[] {
  return filterOrders(allRows(), f, todayBangkok());
}

export function getAdminOrder(ref: string) {
  return getDb().prepare('SELECT * FROM orders WHERE ref = ?').get(ref) as unknown as AdminOrder | undefined;
}

export function updateOrder(ref: string, patch: { status?: string; payment?: string; internal_notes?: string }) {
  const set = cleanPatch(patch);
  if (!set) return false;
  const keys = Object.keys(set) as (keyof typeof set)[];
  const r = getDb()
    .prepare(`UPDATE orders SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE ref = ?`)
    .run(...keys.map((k) => set[k] ?? null), ref);
  return r.changes > 0;
}

export function summary() {
  return summarize(allRows(), todayBangkok());
}

/** Load per day for the capacity view: booked vs capacity, per window. Includes today. */
export function loadRange(from: string, days: number): DayLoad[] {
  const db = getDb();
  const blocked = new Set((db.prepare('SELECT date FROM blocked_dates').all() as { date: string }[]).map((r) => r.date));
  const today = todayBangkok();
  const out: DayLoad[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const rows = db.prepare(`SELECT window_id w, COUNT(*) n FROM orders WHERE date = ? AND ${ACTIVE} GROUP BY window_id`).all(date) as { w: string; n: number }[];
    out.push(loadFrom(date, today, Object.fromEntries(rows.map((r) => [r.w, Number(r.n)])), blocked.has(date)));
  }
  return out;
}

export function setBlocked(date: string, on: boolean, reason?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const db = getDb();
  if (on) db.prepare('INSERT OR REPLACE INTO blocked_dates (date, reason, created_iso) VALUES (?, ?, ?)').run(date, reason ?? null, new Date().toISOString());
  else db.prepare('DELETE FROM blocked_dates WHERE date = ?').run(date);
  return true;
}
