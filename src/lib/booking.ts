import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ACTIVE, getDb } from './db';
import { addDays, rules, staticDayState, TZ, todayBangkok, type DayState, type Kind, type Method } from './rules';
import { getWork } from '@/content/works';

export interface DayAvailability {
  date: string;
  state: DayState;
  left: number;
  windows: { id: string; from: string; to: string; left: number }[];
  reason?: { th: string; en: string };
}

function counts(date: string) {
  const db = getDb();
  const rows = db
    .prepare(`SELECT window_id AS w, COUNT(*) AS n FROM orders WHERE date = ? AND ${ACTIVE} GROUP BY window_id`)
    .all(date) as { w: string; n: number }[];
  const byWindow = Object.fromEntries(rows.map((r) => [r.w, Number(r.n)]));
  const total = rows.reduce((s, r) => s + Number(r.n), 0);
  return { byWindow, total };
}

export function isBlocked(date: string) {
  return getDb().prepare('SELECT reason FROM blocked_dates WHERE date = ?').get(date) as { reason: string | null } | undefined;
}

export function dayAvailability(date: string): DayAvailability {
  let s = staticDayState(date);
  if ((s.state === 'open' || s.state === 'peak') && isBlocked(date)) {
    s = { state: 'closed', capacity: 0, reason: { th: 'ร้านปิดรับออร์เดอร์วันนี้', en: 'The shop isn’t taking orders this day' } };
  }
  if (s.state !== 'open' && s.state !== 'peak') {
    return { date, state: s.state, left: 0, windows: [], reason: s.reason };
  }
  const { byWindow, total } = counts(date);
  const left = Math.max(0, s.capacity - total);
  const windows = rules.windows.map((w) => ({
    id: w.id,
    from: w.from,
    to: w.to,
    left: Math.max(0, Math.min(w.capacity - (byWindow[w.id] ?? 0), left)),
  }));
  return { date, state: left === 0 ? 'full' : s.state, left, windows };
}

export function rangeAvailability(from: string, days: number) {
  const out: DayAvailability[] = [];
  for (let i = 0; i < days; i++) out.push(dayAvailability(addDays(from, i)));
  return out;
}

export function nearestOpen(date: string, n = 3) {
  const out: string[] = [];
  const start = todayBangkok();
  for (let i = 1; i <= rules.horizonDays && out.length < n; i++) {
    const d = addDays(start, i);
    if (d === date) continue;
    const a = dayAvailability(d);
    if (a.state === 'open' || a.state === 'peak') out.push(d);
  }
  return out.sort((a, b) => Math.abs(+new Date(a) - +new Date(date)) - Math.abs(+new Date(b) - +new Date(date)));
}

// ── Orders ────────────────────────────────────────────────────────────────

export interface OrderInput {
  idemKey: string;
  lang: 'th' | 'en';
  kind: Kind;
  workId?: string | null;
  budget: number;
  colour?: string | null;
  occasion?: string | null;
  flowers?: string | null;
  uploadId?: string | null;
  date: string;
  windowId: string;
  method: Method;
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postcode?: string;
  instructions?: string;
  card?: string;
  senderName: string;
  senderPhone: string;
  email?: string;
  notes?: string;
}

export type OrderError =
  | { code: 'invalid'; fields: string[] }
  | { code: 'slot_full' | 'day_full'; nearest: string[]; windows?: DayAvailability['windows'] }
  | { code: 'closed' | 'lead' | 'horizon' | 'past' };

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const phoneOk = (p: string) => /^0\d{8,9}$/.test(p.replace(/[\s-]/g, ''));

/** Server-side validation. Never trusts anything the browser computed. */
export function validate(body: Record<string, unknown>): { input?: OrderInput; fields: string[] } {
  const fields: string[] = [];
  const kind = body.kind === 'box' ? 'box' : body.kind === 'bouquet' ? 'bouquet' : null;
  if (!kind) fields.push('kind');
  const budget = Math.round(Number(body.budget));
  if (!kind || !Number.isFinite(budget) || budget < rules.minBudget[kind] || budget > 200000) fields.push('budget');
  const method = body.method === 'delivery' ? 'delivery' : body.method === 'pickup' ? 'pickup' : null;
  if (!method) fields.push('method');
  const date = str(body.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fields.push('date');
  const windowId = str(body.windowId, 8);
  if (!rules.windows.some((w) => w.id === windowId)) fields.push('windowId');
  const workId = str(body.workId, 20) || null;
  if (workId && !getWork(workId)) fields.push('workId');
  const senderName = str(body.senderName, 80);
  if (!senderName) fields.push('senderName');
  const senderPhone = str(body.senderPhone, 20).replace(/[\s-]/g, '');
  if (!phoneOk(senderPhone)) fields.push('senderPhone');
  const email = str(body.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.push('email');
  const recipientName = str(body.recipientName, 80);
  const recipientPhone = str(body.recipientPhone, 20).replace(/[\s-]/g, '');
  const address = str(body.address, 240);
  const postcode = str(body.postcode, 5);
  if (method === 'delivery') {
    if (!recipientName) fields.push('recipientName');
    if (!phoneOk(recipientPhone)) fields.push('recipientPhone');
    if (!address) fields.push('address');
    if (!str(body.district, 80)) fields.push('district');
    if (!/^\d{5}$/.test(postcode)) fields.push('postcode');
  }
  const idemKey = str(body.idemKey, 64);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(idemKey)) fields.push('idemKey');
  const uploadId = str(body.uploadId, 40) || null;
  if (uploadId && !/^[a-f0-9]{24}$/.test(uploadId)) fields.push('uploadId');
  if (fields.length) return { fields };
  return {
    fields,
    input: {
      idemKey,
      lang: body.lang === 'en' ? 'en' : 'th',
      kind: kind!,
      workId,
      budget,
      colour: str(body.colour, 20) || null,
      occasion: str(body.occasion, 80) || null,
      flowers: str(body.flowers, 400) || null,
      uploadId,
      date,
      windowId,
      method: method!,
      recipientName,
      recipientPhone,
      address,
      subdistrict: str(body.subdistrict, 80),
      district: str(body.district, 80),
      province: str(body.province, 80),
      postcode,
      instructions: str(body.instructions, 200),
      card: str(body.card, rules.cardMax),
      senderName,
      senderPhone,
      email,
      notes: str(body.notes, 400),
    },
  };
}

const hash = (t: string) => createHash('sha256').update(t).digest('hex');

function newRef() {
  // LF + 6 unambiguous characters.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = randomBytes(6);
  return 'LF-' + Array.from(b, (x) => alphabet[x % alphabet.length]).join('');
}

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

    const s = dayAvailability(input.date);
    if (s.state === 'past' || s.state === 'lead' || s.state === 'horizon' || s.state === 'closed') {
      db.exec('ROLLBACK');
      return { ok: false, error: { code: s.state } };
    }
    const a = s;
    if (a.left <= 0) {
      db.exec('ROLLBACK');
      return { ok: false, error: { code: 'day_full', nearest: nearestOpen(input.date) } };
    }
    const win = a.windows.find((w) => w.id === input.windowId);
    if (!win || win.left <= 0) {
      db.exec('ROLLBACK');
      return { ok: false, error: { code: 'slot_full', nearest: [], windows: a.windows } };
    }

    const ref = newRef();
    const token = randomBytes(18).toString('base64url');
    const now = new Date();
    const local = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(now);
    db.prepare(
      `INSERT INTO orders (ref, token_hash, idem_key, created_iso, created_local, lang, kind, work_id, budget, colour, occasion, flowers, upload_id,
        date, window_id, method, recipient_name, recipient_phone, address, subdistrict, district, province, postcode, instructions, card,
        sender_name, sender_phone, email, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      ref, hash(token), input.idemKey, now.toISOString(), `${local} (Bangkok)`, input.lang, input.kind, input.workId ?? null, input.budget,
      input.colour ?? null, input.occasion ?? null, input.flowers ?? null, input.uploadId ?? null, input.date, input.windowId, input.method,
      input.recipientName ?? null, input.recipientPhone ?? null, input.address ?? null, input.subdistrict ?? null, input.district ?? null,
      input.province ?? null, input.postcode ?? null, input.instructions ?? null, input.card ?? null, input.senderName, input.senderPhone,
      input.email || null, input.notes || null,
    );
    db.exec('COMMIT');
    return { ok: true, ref, token, replay: false };
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {}
    throw e;
  }
}

export interface PublicOrder {
  ref: string;
  status: string;
  payment: string;
  kind: Kind;
  workId: string | null;
  budget: number;
  colour: string | null;
  occasion: string | null;
  date: string;
  windowId: string;
  method: Method;
  recipientName: string | null;
  card: string | null;
  hasUpload: boolean;
}

/** Looks an order up for its owner. The token is compared against its hash in constant time. */
export function getOrder(ref: string, token: string): PublicOrder | null {
  if (!/^LF-[A-Z0-9]{6}$/.test(ref) || !token) return null;
  const row = getDb().prepare('SELECT * FROM orders WHERE ref = ? AND seed = 0').get(ref) as Record<string, unknown> | undefined;
  if (!row) return null;
  const a = Buffer.from(String(row.token_hash), 'hex');
  const b = Buffer.from(hash(token), 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  // Only what the customer needs to see: no phone numbers, no address, no internal notes.
  return {
    ref: String(row.ref),
    status: String(row.status),
    payment: String(row.payment),
    kind: row.kind as Kind,
    workId: (row.work_id as string) ?? null,
    budget: Number(row.budget),
    colour: (row.colour as string) ?? null,
    occasion: (row.occasion as string) ?? null,
    date: String(row.date),
    windowId: String(row.window_id),
    method: row.method as Method,
    recipientName: (row.recipient_name as string) ?? null,
    card: (row.card as string) ?? null,
    hasUpload: Boolean(row.upload_id),
  };
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
