/**
 * The static demo's order book, in the visitor's own browser (localStorage). It runs the same engine as
 * the local server (lib/engine.ts): the same validation, capacity per day and per window, idempotent
 * submits and sample orders. Nothing leaves the device; each visitor sees the sample orders plus their own.
 * Browser-only: import it from client code (lib/client-api.ts), never from a server component.
 */
import { photo } from '@/content/works';
import { addDays, todayBangkok } from './rules';
import { imgUrl } from './paths';
import {
  availabilityFrom,
  cleanPatch,
  filterOrders,
  isActive,
  loadFrom,
  nearestOpenFrom,
  publicOrder,
  refFrom,
  rowFrom,
  SAMPLE_UPLOAD,
  seedOrders,
  summarize,
  toCsv,
  validate,
  type AdminOrder,
  type DayAvailability,
  type DayLoad,
  type OrderFilter,
  type OrderRow,
  type PublicOrder,
} from './engine';

const KEY = 'lf-demo-store-v1';
const UPLOAD_MAX = 8 * 1024 * 1024;

interface State {
  v: 1;
  /** The day the sample orders were placed around; they are re-placed when the date changes. */
  seededOn: string;
  orders: OrderRow[];
  blocked: { date: string; reason: string | null }[];
  /** Customer reference pictures, shrunk to fit, as data URLs. */
  uploads: Record<string, string>;
}

let memory: State | null = null; // used when storage is unavailable (private mode, blocked site data)

function read(): State | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null;
    return s && s.v === 1 ? s : null;
  } catch {
    return null;
  }
}

function write(s: State) {
  memory = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch (e) {
    // Only a full store should trigger eviction. Blocked storage (SecurityError) keeps using `memory` for the session.
    const full = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
    return !full;
  }
}

function load(): State {
  const today = todayBangkok();
  const s: State = read() ?? memory ?? { v: 1, seededOn: '', orders: [], blocked: [], uploads: {} };
  if (s.seededOn !== today) {
    s.orders = [...seedOrders(today, Date.now()), ...s.orders.filter((o) => !o.seed)];
    s.seededOn = today;
    write(s);
  }
  return s;
}

function byWindow(s: State, date: string) {
  const out: Record<string, number> = {};
  for (const o of s.orders) if (o.date === date && isActive(o)) out[o.window_id] = (out[o.window_id] ?? 0) + 1;
  return out;
}
const isBlocked = (s: State, date: string) => s.blocked.some((b) => b.date === date);
const dayAt = (s: State) => (date: string) => availabilityFrom(date, byWindow(s, date), isBlocked(s, date));

function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
}
function randomToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── Customer side ─────────────────────────────────────────────────────────

export function availability(from: string, days: number): { today: string; days: DayAvailability[] } {
  const s = load();
  const at = dayAt(s);
  return { today: todayBangkok(), days: Array.from({ length: Math.min(62, Math.max(1, days)) }, (_, i) => at(addDays(from, i))) };
}

/** Places an order; answers with the same status codes and bodies as POST /api/orders. */
export function createOrder(body: Record<string, unknown>): { status: number; json: Record<string, unknown> } {
  const { input, fields } = validate(body);
  if (!input) return { status: 422, json: { error: { code: 'invalid', fields } } };
  const s = load();
  const existing = s.orders.find((o) => o.idem_key === input.idemKey);
  if (existing) return { status: 200, json: { ref: existing.ref, token: existing.token_hash, replay: true } };
  const at = dayAt(s);
  const a = at(input.date);
  if (a.state === 'past' || a.state === 'lead' || a.state === 'horizon' || a.state === 'closed') return { status: 409, json: { error: { code: a.state } } };
  if (a.left <= 0) return { status: 409, json: { error: { code: 'day_full', nearest: nearestOpenFrom(input.date, todayBangkok(), at) } } };
  const win = a.windows.find((w) => w.id === input.windowId);
  if (!win || win.left <= 0) return { status: 409, json: { error: { code: 'slot_full', nearest: [], windows: a.windows } } };
  const token = randomToken();
  let ref = refFrom(crypto.getRandomValues(new Uint8Array(6)));
  while (s.orders.some((o) => o.ref === ref)) ref = refFrom(crypto.getRandomValues(new Uint8Array(6)));
  s.orders.push(rowFrom(input, ref, token, new Date()));
  write(s);
  return { status: 201, json: { ref, token, replay: false } };
}

/** The customer's view of their order: only with the token they were given. */
export function getOrder(ref: string, token: string): PublicOrder | null {
  if (!/^LF-[A-Z0-9]{6}$/.test(ref) || !token) return null;
  const o = load().orders.find((x) => x.ref === ref && !x.seed);
  return o && o.token_hash === token ? publicOrder(o) : null;
}

async function shrinkToDataUrl(blob: Blob, max = 900, q = 0.8): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
const asDataUrl = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });

/** Keeps a reference picture; answers like POST /api/uploads. */
export async function upload(blob: Blob): Promise<{ status: number; json: Record<string, unknown> }> {
  if (blob.size > UPLOAD_MAX) return { status: 413, json: { error: 'too_big' } };
  let data: string;
  try {
    data = await shrinkToDataUrl(blob);
  } catch {
    // A format the browser can't draw (HEIC outside Safari): keep it as it came, if it is small enough.
    if (blob.size > 1.5 * 1024 * 1024) return { status: 413, json: { error: 'too_big' } };
    data = await asDataUrl(blob);
  }
  const s = load();
  const id = randomHex(12);
  s.uploads[id] = data;
  // Storage is small: if it is full, drop the oldest pictures of past orders first, then give up.
  while (!write(s)) {
    const used = new Set(s.orders.filter((o) => o.date >= todayBangkok()).map((o) => o.upload_id));
    const spare = Object.keys(s.uploads).find((k) => k !== id && !used.has(k));
    if (!spare) {
      delete s.uploads[id];
      write(s);
      return { status: 507, json: { error: 'fail' } };
    }
    delete s.uploads[spare];
  }
  return { status: 201, json: { id } };
}

// ── Back office ───────────────────────────────────────────────────────────

export function adminOrdersView(f: OrderFilter & { order?: string }) {
  const s = load();
  const today = todayBangkok();
  return {
    today,
    orders: filterOrders(s.orders, f, today),
    summary: summarize(s.orders, today),
    strip: loadRange(s, today, 14),
    open: f.order ? (s.orders.find((o) => o.ref === f.order) as AdminOrder | undefined) ?? null : null,
  };
}

function loadRange(s: State, from: string, days: number): DayLoad[] {
  const today = todayBangkok();
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(from, i);
    return loadFrom(d, today, byWindow(s, d), isBlocked(s, d));
  });
}

export function adminCapacity(from: string, days: number) {
  return { today: todayBangkok(), days: loadRange(load(), from, days) };
}

export function adminUpdate(ref: string, patch: { status?: string; payment?: string; internal_notes?: string }) {
  const set = cleanPatch(patch);
  if (!set) return false;
  const s = load();
  const o = s.orders.find((x) => x.ref === ref);
  if (!o) return false;
  Object.assign(o, set);
  write(s);
  return true;
}

export function adminBlock(date: string, on: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const s = load();
  s.blocked = s.blocked.filter((b) => b.date !== date);
  if (on) s.blocked.push({ date, reason: null });
  write(s);
  return true;
}

export function adminCsv(f: OrderFilter) {
  const s = load();
  return toCsv(filterOrders(s.orders, f, todayBangkok()));
}

/** A reference picture: the sample order's is one of the shop's own photos. */
export function uploadUrl(id: string) {
  if (id === SAMPLE_UPLOAD.id) return imgUrl(photo(SAMPLE_UPLOAD.work), 828);
  return load().uploads[id] ?? '';
}

/** Clears this browser's demo orders and blocked days; the sample orders come back. */
export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  memory = null;
}
