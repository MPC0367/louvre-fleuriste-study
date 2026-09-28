import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { baht, dict, isLang, longDate, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { colourFamilies, getWork } from '@/content/works';
import { getOrder } from '@/lib/booking';
import { rules } from '@/lib/rules';
import { Photo } from '@/components/Photo';
import { Arrow } from '@/components/Icons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order', robots: { index: false, follow: false } };

export default async function Confirmation({ params, searchParams }: { params: Promise<{ lang: string; ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const { lang: l, ref } = await params;
  if (!isLang(l)) notFound();
  const lang = l as Lang;
  const t = dict[lang];
  const c = t.confirm;
  const { t: token } = await searchParams;
  const order = getOrder(ref, token ?? '');

  if (!order) {
    return (
      <section className="wrap confirm">
        <h1 className="display h-l">{c.missing}</h1>
        <p style={{ marginTop: 32 }}>
          <Link href={`/${lang}/order`} className="btn">
            {t.nav.order}
          </Link>
        </p>
      </section>
    );
  }

  const work = order.workId ? getWork(order.workId) : undefined;
  const win = rules.windows.find((w) => w.id === order.windowId)!;
  const colour = colourFamilies.find((x) => x.key === order.colour)?.[lang];
  const wd = t.weekdays[new Date(order.date + 'T00:00:00Z').getUTCDay()];

  return (
    <section className="wrap confirm">
      <div className="grid confirm__grid">
        <div className="confirm__copy">
          <p className="hero__kicker label">{c.kicker}</p>
          <h1 className="display h-xl">{c.title}</h1>
          <p className="lede">{c.body}</p>
          <p className="alert alert--info small">
            <span>
              <span className="demo-mark">{t.concept.demo}</span> {c.preview}
            </span>
          </p>
          <div>
            <p className="label">{c.ref}</p>
            <p className="confirm__ref" lang="en">
              {order.ref}
            </p>
          </div>
          <div className="stack-s">
            <p className="label">{c.next}</p>
            <p>{c.nextBody}</p>
            <p className="close__phones" style={{ gap: '4px 24px' }}>
              {shop.phones.value.map((p) => (
                <a key={p.tel} href={`tel:${p.tel}`} className="link" style={{ color: 'var(--ink)' }}>
                  {p.display}
                </a>
              ))}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <a className="btn" href={`/api/orders/${order.ref}/ics?t=${encodeURIComponent(token!)}`} download>
              <span className="btn__diamond" aria-hidden="true" />
              {c.calendar}
            </a>
            <Link href={`/${lang}/works`} className="btn btn--ghost">
              {c.again} <Arrow />
            </Link>
          </div>
        </div>
        <aside className="confirm__tag">
          <div className="ordertag">
            <p className="ordertag__brand" lang="en">
              <b>LOUVRE</b>
              <i>fleuriste</i>
            </p>
            {work && (
              <div className="ordertag__photo">
                <Photo work={work} lang={lang} sizes="132px" ar="1 / 1" />
              </div>
            )}
            <dl>
              {(
                [
                  [c.status, c.statusNew],
                  [c.payment, c.paymentNone],
                  [t.fields.kind, order.kind === 'box' ? t.order.box : t.order.bouquet],
                  ...(work ? [[t.fields.work, `No. ${String(work.no).padStart(2, '0')} ${work.name[lang]}`]] : []),
                  [t.fields.budget, baht(order.budget, lang)],
                  ...(colour ? [[t.fields.colour, colour]] : []),
                  [t.fields.date, `${wd} ${longDate(order.date, lang)}`],
                  [t.fields.window, `${win.from}–${win.to}`],
                  [t.fields.method, order.method === 'delivery' ? t.order.delivery : t.order.pickup],
                  ...(order.recipientName ? [[t.order.recipient, order.recipientName]] : []),
                  ...(order.card ? [[t.fields.card, order.card]] : []),
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="ordertag__row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
