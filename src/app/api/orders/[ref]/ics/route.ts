import { getOrder } from '@/lib/booking';
import { rules } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const t = new URL(req.url).searchParams.get('t') ?? '';
  const o = getOrder(ref, t);
  if (!o) return new Response('Not found', { status: 404 });
  const w = rules.windows.find((x) => x.id === o.windowId)!;
  const d = o.date.replace(/-/g, '');
  const hm = (s: string) => s.replace(':', '') + '00';
  const title = o.method === 'delivery' ? 'Louvre Fleuriste — flower delivery' : 'Louvre Fleuriste — collect flowers';
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//O2 Design Studio//Louvre Fleuriste study//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Bangkok', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0700', 'TZOFFSETTO:+0700', 'TZNAME:ICT', 'END:STANDARD', 'END:VTIMEZONE',
    'BEGIN:VEVENT', `UID:${o.ref}@louvre-fleuriste.example`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Asia/Bangkok:${d}T${hm(w.from)}`, `DTEND;TZID=Asia/Bangkok:${d}T${hm(w.to)}`,
    `SUMMARY:${title}`, `DESCRIPTION:Order ${o.ref}. Awaiting the shop's confirmation.`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return new Response(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${o.ref}.ics"` },
  });
}
