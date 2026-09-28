/**
 * Operating rules for the booking engine. Every value is `demo`: invented so the engine can be
 * reviewed, never confirmed by Louvre Fleuriste. The shop replaces these — nothing in the UI
 * hard-codes them. Shared by server and client (no secrets here).
 */
import { shop } from '@/content/shop';

export const TZ = 'Asia/Bangkok';

export type Kind = 'bouquet' | 'box';
export type Method = 'delivery' | 'pickup';

export interface Window {
  id: string;
  from: string;
  to: string;
  capacity: number;
}

export const rules = {
  provenance: 'demo' as const,
  /** Orders for tomorrow onward; same day is not offered. */
  leadDays: 1,
  /** Orders for tomorrow close at this local hour today. */
  cutoffHour: 15,
  /** How far ahead the calendar opens. */
  horizonDays: 60,
  /** Arrangements the studio can make in a day. */
  dailyCapacity: 10,
  windows: [
    { id: 'am', from: '10:00', to: '13:00', capacity: 4 },
    { id: 'pm', from: '13:00', to: '16:00', capacity: 4 },
    { id: 'eve', from: '16:00', to: '19:00', capacity: 3 },
  ] satisfies Window[],
  /** Weekdays closed, 0 = Sunday. */
  closedWeekdays: [] as number[],
  /** Specific closures, with a reason in both languages. */
  blackout: [{ date: '2026-10-13', th: 'ร้านปิดหนึ่งวัน', en: 'The shop is closed for the day' }],
  /** High-demand days: reduced capacity, shown as peak. */
  peak: [
    { date: '2027-02-13', capacity: 6 },
    { date: '2027-02-14', capacity: 6 },
  ],
  budgetTiers: {
    bouquet: [shop.bouquetFrom.value, 3500, 5000],
    box: [shop.boxFrom.value, 3000, 4500],
  } as Record<Kind, number[]>,
  minBudget: { bouquet: shop.bouquetFrom.value, box: shop.boxFrom.value } as Record<Kind, number>,
  /** The most the order form takes; larger orders go to the shop directly. */
  maxBudget: 200000,
  cardMax: 180,
};

/** Today's date in Bangkok, as YYYY-MM-DD, independent of server or browser timezone. */
export function todayBangkok(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function hourBangkok(now = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(now));
}

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function weekday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export type DayState = 'past' | 'lead' | 'closed' | 'full' | 'peak' | 'open' | 'horizon';

/** The static part of a day's state — everything except how many orders are already booked. */
export function staticDayState(iso: string, now = new Date()): { state: DayState; capacity: number; reason?: { th: string; en: string } } {
  const today = todayBangkok(now);
  if (iso <= today) return { state: 'past', capacity: 0 };
  const earliest = addDays(today, rules.leadDays + (hourBangkok(now) >= rules.cutoffHour ? 1 : 0));
  if (iso < earliest) return { state: 'lead', capacity: 0 };
  if (iso > addDays(today, rules.horizonDays)) return { state: 'horizon', capacity: 0 };
  const b = rules.blackout.find((x) => x.date === iso);
  if (b) return { state: 'closed', capacity: 0, reason: { th: b.th, en: b.en } };
  if (rules.closedWeekdays.includes(weekday(iso))) return { state: 'closed', capacity: 0 };
  const p = rules.peak.find((x) => x.date === iso);
  if (p) return { state: 'peak', capacity: p.capacity };
  return { state: 'open', capacity: rules.dailyCapacity };
}
