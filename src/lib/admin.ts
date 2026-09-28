import { ACTIVE, getDb } from './db';
import { dayAvailability } from './booking';
import { addDays, rules, staticDayState, todayBangkok } from './rules';

/**
 * Demo admin. There is no sign-in: it runs only outside production, or when LF_ADMIN_DEMO=1 is set
 * deliberately. A real build puts this behind staff authentication (see README).
 */
export function adminAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.LF_ADMIN_DEMO === '1';
}

export const STATUSES = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'] as const;
export const PAYMENTS = ['unpaid', 'deposit', 'paid'] as const;
export type Status = (typeof STATUSES)[number];
export type Payment = (typeof PAYMENTS)[number];

export interface AdminOrder {
  ref: string;
  created_iso: string;
  created_local: string;
  status: Status;
  payment: Payment;
  lang: string;
  kind: 'bouquet' | 'box';
  work_id: string | null;
  budget: number;
  colour: string | null;
  occasion: string | null;
  flowers: string | null;
  upload_id: string | null;
  date: string;
  window_id: string;
  method: 'delivery' | 'pickup';
  recipient_name: string | null;
  recipient_phone: string | null;
  address: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postcode: string | null;
  instructions: string | null;
  card: string | null;
  sender_name: string;
  sender_phone: string;
  email: string | null;
  notes: string | null;
  internal_notes: string | null;
  seed: number;
}

export interface OrderFilter {
  status?: string;
  date?: string;
  q?: string;
  range?: 'upcoming' | 'past' | 'all';
}

export function listOrders(f: OrderFilter): AdminOrder[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  const today = todayBangkok();
  if (f.date) {
    where.push('date = ?');
    args.push(f.date);
  } else if (f.range === 'past') {
    where.push('date < ?');
    args.push(today);
  } else if (f.range !== 'all') {
    where.push('date >= ?');
    args.push(today);
  }
  if (f.status === 'open') where.push(`status NOT IN ('completed', 'cancelled')`);
  else if (f.status && (STATUSES as readonly string[]).includes(f.status)) {
    where.push('status = ?');
    args.push(f.status);
  }
  if (f.q) {
    where.push('(ref LIKE ? OR sender_name LIKE ? OR sender_phone LIKE ? OR recipient_name LIKE ?)');
    const like = `%${f.q.trim()}%`;
    args.push(like, like, like.replace(/[\s-]/g, ''), like);
  }
  const order = f.range === 'past' ? 'date DESC, window_id DESC' : `date ASC, CASE window_id WHEN 'am' THEN 0 WHEN 'pm' THEN 1 ELSE 2 END ASC, created_iso ASC`;
  return getDb()
    .prepare(`SELECT * FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT 300`)
    .all(...args) as unknown as AdminOrder[];
}

export function getAdminOrder(ref: string) {
  return getDb().prepare('SELECT * FROM orders WHERE ref = ?').get(ref) as unknown as AdminOrder | undefined;
}

export function updateOrder(ref: string, patch: { status?: string; payment?: string; internal_notes?: string }) {
  const sets: string[] = [];
  const args: (string | null)[] = [];
  if (patch.status !== undefined) {
    if (!(STATUSES as readonly string[]).includes(patch.status)) return false;
    sets.push('status = ?');
    args.push(patch.status);
  }
  if (patch.payment !== undefined) {
    if (!(PAYMENTS as readonly string[]).includes(patch.payment)) return false;
    sets.push('payment = ?');
    args.push(patch.payment);
  }
  if (patch.internal_notes !== undefined) {
    sets.push('internal_notes = ?');
    args.push(String(patch.internal_notes).slice(0, 1000) || null);
  }
  if (!sets.length) return false;
  const r = getDb().prepare(`UPDATE orders SET ${sets.join(', ')} WHERE ref = ?`).run(...args, ref);
  return r.changes > 0;
}

/** Counts for the header strip — computed from the orders table, never typed in. */
export function summary() {
  const db = getDb();
  const today = todayBangkok();
  const one = (sql: string, ...a: string[]) => Number((db.prepare(sql).get(...a) as { n: number }).n);
  return {
    awaiting: one(`SELECT COUNT(*) n FROM orders WHERE status = 'new' AND date >= ?`, today),
    today: one(`SELECT COUNT(*) n FROM orders WHERE date = ? AND ${ACTIVE}`, today),
    todayDelivery: one(`SELECT COUNT(*) n FROM orders WHERE date = ? AND method = 'delivery' AND ${ACTIVE}`, today),
    unpaid: one(`SELECT COUNT(*) n FROM orders WHERE payment != 'paid' AND date >= ? AND ${ACTIVE}`, today),
    next7: one(`SELECT COUNT(*) n FROM orders WHERE date >= ? AND date < ? AND ${ACTIVE}`, today, addDays(today, 7)),
  };
}

export interface DayLoad {
  date: string;
  booked: number;
  capacity: number;
  state: string;
  blocked: boolean;
  windows: { id: string; from: string; to: string; booked: number; capacity: number }[];
}

/** Load per day for the capacity view: booked vs capacity, per window. Includes today. */
export function loadRange(from: string, days: number): DayLoad[] {
  const db = getDb();
  const blocked = new Set((db.prepare('SELECT date FROM blocked_dates').all() as { date: string }[]).map((r) => r.date));
  const out: DayLoad[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const rows = db.prepare(`SELECT window_id w, COUNT(*) n FROM orders WHERE date = ? AND ${ACTIVE} GROUP BY window_id`).all(date) as { w: string; n: number }[];
    const by = Object.fromEntries(rows.map((r) => [r.w, Number(r.n)]));
    const booked = rows.reduce((s, r) => s + Number(r.n), 0);
    const st = staticDayState(date);
    const peak = rules.peak.find((p) => p.date === date);
    const capacity = peak ? peak.capacity : rules.dailyCapacity;
    const avail = date > todayBangkok() ? dayAvailability(date) : null;
    out.push({
      date,
      booked,
      capacity,
      state: blocked.has(date) ? 'blocked' : st.state === 'closed' ? 'closed' : avail?.state ?? (date === todayBangkok() ? 'today' : st.state),
      blocked: blocked.has(date),
      windows: rules.windows.map((w) => ({ id: w.id, from: w.from, to: w.to, booked: by[w.id] ?? 0, capacity: w.capacity })),
    });
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

export function toCsv(rows: AdminOrder[]) {
  const cols: (keyof AdminOrder)[] = [
    'ref', 'date', 'window_id', 'status', 'payment', 'kind', 'budget', 'work_id', 'colour', 'occasion', 'method',
    'recipient_name', 'recipient_phone', 'address', 'subdistrict', 'district', 'province', 'postcode', 'instructions',
    'card', 'sender_name', 'sender_phone', 'email', 'notes', 'internal_notes', 'created_local',
  ];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    // Neutralise spreadsheet formulas.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
}
