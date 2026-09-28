/**
 * The one door the pages use to reach orders. Locally it talks to the Next.js API routes (SQLite);
 * in the static demo (NEXT_PUBLIC_LF_STATIC=1) it talks to lib/demo-store.ts in the visitor's browser.
 * Both answer with the same shapes, so the order form, the confirmation and the back office don't know
 * which one they are running on. Mutations announce themselves with a 'lf:data' event so open views reload.
 */
import { STATIC } from './paths';
import type { AdminOrder, DayAvailability, DayLoad, OrderFilter, PublicOrder, Summary } from './engine';

type Store = typeof import('./demo-store');
let demo: Promise<Store> | null = null;
const store = () => (demo ??= import('./demo-store'));

export const changed = () => window.dispatchEvent(new Event('lf:data'));

export interface Reply {
  status: number;
  ok: boolean;
  json: Record<string, unknown>;
}
const reply = (status: number, json: Record<string, unknown>): Reply => ({ status, ok: status >= 200 && status < 300, json });

async function http(url: string, init?: RequestInit): Promise<Reply> {
  const r = await fetch(url, init);
  const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return reply(r.status, json);
}
const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  return p.toString();
};

// ── Customer side ─────────────────────────────────────────────────────────

export async function availability(from: string, days = 42): Promise<{ days: DayAvailability[] }> {
  if (STATIC) return (await store()).availability(from, days);
  const r = await http(`/api/availability?${qs({ from, days })}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('availability');
  return r.json as unknown as { days: DayAvailability[] };
}

export async function placeOrder(body: Record<string, unknown>): Promise<Reply> {
  if (STATIC) {
    const r = (await store()).createOrder(body);
    return reply(r.status, r.json);
  }
  return http('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export async function uploadPicture(blob: Blob, name: string): Promise<Reply> {
  if (STATIC) {
    const r = await (await store()).upload(blob);
    return reply(r.status, r.json);
  }
  const fd = new FormData();
  fd.append('file', blob, name);
  return http('/api/uploads', { method: 'POST', body: fd });
}

export async function getOrder(ref: string, token: string): Promise<PublicOrder | null> {
  if (STATIC) return (await store()).getOrder(ref, token);
  const r = await http(`/api/orders/${encodeURIComponent(ref)}?${qs({ t: token })}`, { cache: 'no-store' });
  return r.ok ? (r.json as unknown as PublicOrder) : null;
}

// ── Back office ───────────────────────────────────────────────────────────

export interface OrdersView {
  today: string;
  orders: AdminOrder[];
  summary: Summary;
  strip: DayLoad[];
  open: AdminOrder | null;
}

export async function adminOrders(f: OrderFilter & { order?: string }): Promise<OrdersView> {
  if (STATIC) return (await store()).adminOrdersView(f);
  const r = await http(`/api/admin/view?${qs({ ...f })}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('admin');
  return r.json as unknown as OrdersView;
}

export async function adminCapacity(from: string, days: number): Promise<{ today: string; days: DayLoad[] }> {
  if (STATIC) return (await store()).adminCapacity(from, days);
  const r = await http(`/api/admin/capacity?${qs({ from, days })}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('capacity');
  return r.json as unknown as { today: string; days: DayLoad[] };
}

export async function adminUpdate(ref: string, patch: Record<string, string>): Promise<boolean> {
  let ok: boolean;
  if (STATIC) ok = (await store()).adminUpdate(ref, patch);
  else ok = (await http(`/api/admin/orders/${encodeURIComponent(ref)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => reply(0, {}))).ok;
  if (ok) changed();
  return ok;
}

export async function adminBlock(date: string, blocked: boolean): Promise<boolean> {
  let ok: boolean;
  if (STATIC) ok = (await store()).adminBlock(date, blocked);
  else ok = (await http('/api/admin/days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, blocked }) }).catch(() => reply(0, {}))).ok;
  if (ok) changed();
  return ok;
}

export async function adminCsv(f: OrderFilter): Promise<string> {
  if (STATIC) return (await store()).adminCsv(f);
  const r = await fetch(`/api/admin/export?${qs({ ...f })}`);
  if (!r.ok) throw new Error('export');
  return r.text();
}

export async function uploadUrl(id: string): Promise<string> {
  if (STATIC) return (await store()).uploadUrl(id);
  return `/api/admin/uploads/${encodeURIComponent(id)}`;
}

/** Saves a text file the browser can hand to the visitor (CSV export, calendar file). */
export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
