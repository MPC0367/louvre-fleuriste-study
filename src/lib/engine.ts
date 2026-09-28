/**
 * The order engine's pure logic: validation, availability arithmetic, the sample orders, admin
 * filtering and summaries, CSV and calendar files. No database, no Node, no browser APIs, so the
 * local server (SQLite, lib/booking.ts + lib/admin.ts) and the static demo (lib/demo-store.ts, in the
 * visitor's browser) run exactly the same rules.
 */
import { getWork } from '@/content/works';
import { addDays, rules, staticDayState, type DayState, type Kind, type Method } from './rules';

// ── Types ─────────────────────────────────────────────────────────────────

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
  kind: Kind;
  work_id: string | null;
  budget: number;
  colour: string | null;
  occasion: string | null;
  flowers: string | null;
  upload_id: string | null;
  date: string;
  window_id: string;
  method: Method;
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

/** A stored order: the admin view plus what only the store sees. */
export interface OrderRow extends AdminOrder {
  idem_key: string;
  /** Server: sha-256 of the owner's token. Demo: the token itself (it never leaves the visitor's browser). */
  token_hash: string;
}

export interface DayAvailability {
  date: string;
  state: DayState;
  left: number;
  windows: { id: string; from: string; to: string; left: number }[];
  reason?: { th: string; en: string };
}

export interface DayLoad {
  date: string;
  booked: number;
  capacity: number;
  state: string;
  blocked: boolean;
  windows: { id: string; from: string; to: string; booked: number; capacity: number }[];
}

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

export interface OrderFilter {
  status?: string;
  date?: string;
  q?: string;
  range?: 'upcoming' | 'past' | 'all';
}

/** Orders that hold a place in the day's capacity. */
export const isActive = (o: { status: string }) => o.status !== 'cancelled' && o.status !== 'rejected';

// ── Validation ────────────────────────────────────────────────────────────

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const phoneOk = (p: string) => /^0\d{8,9}$/.test(p.replace(/[\s-]/g, ''));

/** Validates an order body. Never trusts anything the form computed. */
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

// ── Availability ──────────────────────────────────────────────────────────

const CLOSED_BY_SHOP = { th: 'ร้านปิดรับออร์เดอร์วันนี้', en: 'The shop isn’t taking orders this day' };

/** A day's availability from its active bookings per window and whether the shop blocked it. */
export function availabilityFrom(date: string, byWindow: Record<string, number>, blocked: boolean): DayAvailability {
  let s = staticDayState(date);
  if ((s.state === 'open' || s.state === 'peak') && blocked) s = { state: 'closed', capacity: 0, reason: CLOSED_BY_SHOP };
  if (s.state !== 'open' && s.state !== 'peak') return { date, state: s.state, left: 0, windows: [], reason: s.reason };
  const total = Object.values(byWindow).reduce((a, b) => a + b, 0);
  const left = Math.max(0, s.capacity - total);
  const windows = rules.windows.map((w) => ({ id: w.id, from: w.from, to: w.to, left: Math.max(0, Math.min(w.capacity - (byWindow[w.id] ?? 0), left)) }));
  return { date, state: left === 0 ? 'full' : s.state, left, windows };
}

/** Up to n open days near a date, nearest first, within the booking horizon from today. */
export function nearestOpenFrom(date: string, today: string, dayAt: (d: string) => DayAvailability, n = 3) {
  const out: string[] = [];
  for (let i = 1; i <= rules.horizonDays && out.length < n; i++) {
    const d = addDays(today, i);
    if (d === date) continue;
    const a = dayAt(d);
    if (a.state === 'open' || a.state === 'peak') out.push(d);
  }
  return out.sort((a, b) => Math.abs(+new Date(a) - +new Date(date)) - Math.abs(+new Date(b) - +new Date(date)));
}

/** Per-day load for the capacity view and the admin strip. */
export function loadFrom(date: string, today: string, byWindow: Record<string, number>, blocked: boolean): DayLoad {
  const booked = Object.values(byWindow).reduce((a, b) => a + b, 0);
  const st = staticDayState(date);
  const peak = rules.peak.find((p) => p.date === date);
  const capacity = peak ? peak.capacity : rules.dailyCapacity;
  const avail = date > today ? availabilityFrom(date, byWindow, blocked) : null;
  return {
    date,
    booked,
    capacity,
    state: blocked ? 'blocked' : st.state === 'closed' ? 'closed' : avail?.state ?? (date === today ? 'today' : st.state),
    blocked,
    windows: rules.windows.map((w) => ({ id: w.id, from: w.from, to: w.to, booked: byWindow[w.id] ?? 0, capacity: w.capacity })),
  };
}

// ── Orders ────────────────────────────────────────────────────────────────

/** LF + 6 unambiguous characters, from any source of random bytes. */
export function refFrom(bytes: ArrayLike<number>) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return 'LF-' + Array.from({ length: 6 }, (_, i) => alphabet[bytes[i] % alphabet.length]).join('');
}

export const bangkokStamp = (d: Date) => `${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }).format(d)} (Bangkok)`;

/** The stored row for a new order. */
export function rowFrom(input: OrderInput, ref: string, tokenHash: string, now: Date): OrderRow {
  return {
    ref,
    token_hash: tokenHash,
    idem_key: input.idemKey,
    created_iso: now.toISOString(),
    created_local: bangkokStamp(now),
    status: 'new',
    payment: 'unpaid',
    lang: input.lang,
    kind: input.kind,
    work_id: input.workId ?? null,
    budget: input.budget,
    colour: input.colour ?? null,
    occasion: input.occasion ?? null,
    flowers: input.flowers ?? null,
    upload_id: input.uploadId ?? null,
    date: input.date,
    window_id: input.windowId,
    method: input.method,
    recipient_name: input.recipientName || null,
    recipient_phone: input.recipientPhone || null,
    address: input.address || null,
    subdistrict: input.subdistrict || null,
    district: input.district || null,
    province: input.province || null,
    postcode: input.postcode || null,
    instructions: input.instructions || null,
    card: input.card || null,
    sender_name: input.senderName,
    sender_phone: input.senderPhone,
    email: input.email || null,
    notes: input.notes || null,
    internal_notes: null,
    seed: 0,
  };
}

/** Only what the customer needs to see: no phone numbers, no address, no internal notes. */
export function publicOrder(row: AdminOrder): PublicOrder {
  return {
    ref: row.ref,
    status: row.status,
    payment: row.payment,
    kind: row.kind,
    workId: row.work_id ?? null,
    budget: Number(row.budget),
    colour: row.colour ?? null,
    occasion: row.occasion ?? null,
    date: row.date,
    windowId: row.window_id,
    method: row.method,
    recipientName: row.recipient_name ?? null,
    card: row.card ?? null,
    hasUpload: Boolean(row.upload_id),
  };
}

// ── Sample orders ─────────────────────────────────────────────────────────

const NAMES = ['ปอย ศ.', 'Mild K.', 'คุณแพร', 'Tanya R.', 'คุณบีม', 'Nok P.', 'คุณเฟิร์น', 'James L.', 'คุณมิ้นท์', 'Aom W.', 'คุณต้น', 'Fah S.', 'คุณจูน', 'Ken T.', 'คุณพลอย', 'May C.'];
const RECIPS = ['คุณแม่', 'Nina', 'คุณยาย', 'Pim', 'คุณครู', 'Joy', 'พี่สาว', 'Ann'];
const CARDS = [
  'สุขสันต์วันเกิดนะแม่ รักที่สุด',
  'Happy anniversary — five years and counting.',
  'ยินดีด้วยกับการเรียนจบนะ',
  'Thank you for everything this year.',
  'ขอให้หายไว ๆ นะ',
  'For no reason at all. x',
];
const WORK_IDS = ['DdLG95xiV-c', 'Dcc0QsXgRFW', 'DZogaHrAYa5', 'DbIKVRSgVKW', null, 'Da2GRv_geDn', null, 'DZWpv9iATQ4'];
const COLOURS = ['white', 'blue', 'pink', 'white', 'lavender', 'peach', 'any', 'pink'];
/** The one sample order that carries a customer reference picture (a screenshot of one of the shop's posts). */
export const SAMPLE_UPLOAD = { id: '5a3e1f00c0ffee0000000001', ref: 'LF-S00015', work: 'DXd1mNPgZii' };

/**
 * Sample orders, so the admin and the full / nearly-full calendar states can be reviewed. Placed relative
 * to today; every row is seed = 1. Names, phones, addresses and card messages are invented and marked as
 * samples on screen.
 */
export function seedOrders(today: string, nowMs: number): OrderRow[] {
  const rows: OrderRow[] = [];
  const wins = rules.windows.map((w) => w.id);
  let n = 0;
  const put = (offset: number, status: Status, payment: Payment, opts: { win?: string; method?: Method; kind?: Kind; notes?: string; internal?: string } = {}) => {
    const i = n++;
    const date = addDays(today, offset);
    const kind = opts.kind ?? (i % 5 === 3 ? 'box' : 'bouquet');
    const method = opts.method ?? (i % 3 === 1 ? 'pickup' : 'delivery');
    const created = new Date(nowMs - (Math.max(1, 3 - offset) * 86400000 + i * 3600000));
    const budgets = kind === 'box' ? [2000, 3000, 4500] : [2500, 3500, 5000, 4200];
    const d = method === 'delivery';
    const ref = `LF-S${String(i + 1).padStart(5, '0')}`;
    rows.push({
      ref,
      token_hash: 'x',
      idem_key: `sample-${i}`,
      created_iso: created.toISOString(),
      created_local: bangkokStamp(created),
      status,
      payment,
      lang: i % 3 === 2 ? 'en' : 'th',
      kind,
      work_id: kind === 'box' ? null : WORK_IDS[i % WORK_IDS.length],
      budget: budgets[i % budgets.length],
      colour: COLOURS[i % COLOURS.length],
      occasion: i % 4 === 0 ? 'mothers-day' : i % 4 === 1 ? 'birthday' : null,
      flowers: i % 3 === 0 ? 'ไม่เอาลิลลี่' : null,
      upload_id: ref === SAMPLE_UPLOAD.ref ? SAMPLE_UPLOAD.id : null,
      date,
      window_id: opts.win ?? wins[i % wins.length],
      method,
      recipient_name: d ? RECIPS[i % RECIPS.length] : null,
      recipient_phone: d ? `08000002${String(i).padStart(2, '0')}` : null,
      address: d ? `ที่อยู่ตัวอย่าง ${10 + i}/${i + 1} ซอยสุขุมวิท ${50 + i * 2}` : null,
      subdistrict: d ? 'พระโขนงเหนือ' : null,
      district: d ? 'วัฒนา' : null,
      province: d ? 'กรุงเทพมหานคร' : null,
      postcode: d ? '10110' : null,
      instructions: d && i % 2 ? 'ฝากไว้ที่ล็อบบี้' : null,
      card: CARDS[i % CARDS.length],
      sender_name: NAMES[i % NAMES.length],
      sender_phone: `08000001${String(i).padStart(2, '0')}`,
      email: null,
      notes: opts.notes ?? null,
      internal_notes: opts.internal ?? null,
      seed: 1,
    });
  };
  put(-2, 'completed', 'paid');
  put(-2, 'completed', 'paid', { method: 'pickup' });
  put(-1, 'completed', 'paid');
  put(-1, 'cancelled', 'unpaid', { internal: 'ลูกค้ายกเลิกทางโทรศัพท์' });
  put(0, 'out_for_delivery', 'paid', { win: 'am', method: 'delivery' });
  put(0, 'ready', 'paid', { win: 'pm', method: 'pickup' });
  put(0, 'preparing', 'deposit', { win: 'eve', method: 'delivery', internal: 'รอไฮเดรนเยียเข้าช่วงบ่าย' });
  put(1, 'confirmed', 'paid');
  put(1, 'confirmed', 'deposit');
  put(1, 'new', 'unpaid', { notes: 'อยากได้ริบบิ้นสีเงินแบบในรูป' });
  // Day +2: the morning window is full.
  for (let k = 0; k < rules.windows[0].capacity; k++) put(2, k < 2 ? 'confirmed' : 'new', k < 2 ? 'paid' : 'unpaid', { win: 'am' });
  put(3, 'new', 'unpaid', { notes: 'ขอโทนเดียวกับไฮเดรนเยียฟ้า' });
  put(3, 'new', 'unpaid', { kind: 'box' });
  // Day +4: the whole day is booked — the calendar shows it as full.
  const caps = rules.windows.map((w) => w.capacity);
  const counts = [0, 0, 0];
  for (let k = 0; k < rules.dailyCapacity; k++) {
    let w = k % wins.length;
    while (counts[w] >= caps[w]) w = (w + 1) % wins.length;
    counts[w]++;
    put(4, k < 6 ? 'confirmed' : 'new', k < 4 ? 'paid' : k < 6 ? 'deposit' : 'unpaid', { win: wins[w] });
  }
  put(6, 'new', 'unpaid');
  put(9, 'confirmed', 'deposit');
  return rows;
}

// ── Admin ─────────────────────────────────────────────────────────────────

const WIN_ORDER: Record<string, number> = { am: 0, pm: 1 };

/** The admin list: same filters and ordering as the SQL version, over an array. */
export function filterOrders(rows: AdminOrder[], f: OrderFilter, today: string): AdminOrder[] {
  const q = f.q?.trim().toLowerCase();
  const qPhone = q?.replace(/[\s-]/g, '');
  const out = rows.filter((o) => {
    if (f.date) {
      if (o.date !== f.date) return false;
    } else if (f.range === 'past') {
      if (!(o.date < today)) return false;
    } else if (f.range !== 'all') {
      if (!(o.date >= today)) return false;
    }
    if (f.status === 'open') {
      if (o.status === 'completed' || o.status === 'cancelled') return false;
    } else if (f.status && (STATUSES as readonly string[]).includes(f.status) && o.status !== f.status) return false;
    if (q) {
      const hit =
        o.ref.toLowerCase().includes(q) ||
        o.sender_name.toLowerCase().includes(q) ||
        o.sender_phone.includes(qPhone!) ||
        (o.recipient_name ?? '').toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });
  const w = (id: string) => WIN_ORDER[id] ?? 2;
  if (f.range === 'past') out.sort((a, b) => b.date.localeCompare(a.date) || b.window_id.localeCompare(a.window_id));
  else out.sort((a, b) => a.date.localeCompare(b.date) || w(a.window_id) - w(b.window_id) || a.created_iso.localeCompare(b.created_iso));
  return out.slice(0, 300);
}

/** Counts for the header strip — computed from the orders, never typed in. */
export function summarize(rows: AdminOrder[], today: string) {
  const next7 = addDays(today, 7);
  return {
    awaiting: rows.filter((o) => o.status === 'new' && o.date >= today).length,
    today: rows.filter((o) => o.date === today && isActive(o)).length,
    todayDelivery: rows.filter((o) => o.date === today && o.method === 'delivery' && isActive(o)).length,
    unpaid: rows.filter((o) => o.payment !== 'paid' && o.date >= today && isActive(o)).length,
    next7: rows.filter((o) => o.date >= today && o.date < next7 && isActive(o)).length,
  };
}
export type Summary = ReturnType<typeof summarize>;

/** Validates an admin edit; returns the fields to set, or null if nothing valid was sent. */
export function cleanPatch(patch: { status?: string; payment?: string; internal_notes?: string }) {
  const out: Partial<Pick<AdminOrder, 'status' | 'payment' | 'internal_notes'>> = {};
  if (patch.status !== undefined) {
    if (!(STATUSES as readonly string[]).includes(patch.status)) return null;
    out.status = patch.status as Status;
  }
  if (patch.payment !== undefined) {
    if (!(PAYMENTS as readonly string[]).includes(patch.payment)) return null;
    out.payment = patch.payment as Payment;
  }
  if (patch.internal_notes !== undefined) out.internal_notes = String(patch.internal_notes).slice(0, 1000) || null;
  return Object.keys(out).length ? out : null;
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

/** A calendar file for the delivery or collection window. */
export function orderIcs(o: PublicOrder, now = new Date()) {
  const w = rules.windows.find((x) => x.id === o.windowId)!;
  const d = o.date.replace(/-/g, '');
  const hm = (s: string) => s.replace(':', '') + '00';
  const title = o.method === 'delivery' ? 'Louvre Fleuriste — flower delivery' : 'Louvre Fleuriste — collect flowers';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//O2 Design Studio//Louvre Fleuriste demo//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Bangkok', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0700', 'TZOFFSETTO:+0700', 'TZNAME:ICT', 'END:STANDARD', 'END:VTIMEZONE',
    'BEGIN:VEVENT', `UID:${o.ref}@louvre-fleuriste.demo`, `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Asia/Bangkok:${d}T${hm(w.from)}`, `DTEND;TZID=Asia/Bangkok:${d}T${hm(w.to)}`,
    `SUMMARY:${title}`, `DESCRIPTION:Order ${o.ref}. Awaiting the shop's confirmation.`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
