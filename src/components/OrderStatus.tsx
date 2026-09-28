'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { baht, dict, longDate, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { colourFamilies, getWork } from '@/content/works';
import { rules } from '@/lib/rules';
import { orderIcs, type PublicOrder } from '@/lib/engine';
import { download, getOrder } from '@/lib/client-api';
import { STATIC } from '@/lib/paths';
import { Photo } from './Photo';
import { Arrow } from './Icons';

/**
 * The confirmation a customer lands on after ordering: /order/status?ref=…&t=…. The token in the link is
 * the only key to the order (it is not guessable from the reference), and only the customer-safe fields
 * are shown.
 */
export function OrderStatus({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const c = t.confirm;
  const q = useSearchParams();
  const ref = q.get('ref') ?? '';
  const token = q.get('t') ?? '';
  const [order, setOrder] = useState<PublicOrder | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    getOrder(ref, token)
      .then((o) => {
        if (!live) return;
        setOrder(o);
        window.scrollTo(0, 0); // the order form may have left the page scrolled down
      })
      .catch(() => live && setOrder(null));
    return () => {
      live = false;
    };
  }, [ref, token]);

  if (order === undefined) return <section className="wrap confirm" aria-busy="true" />;

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
  const cancelled = order.status === 'cancelled';

  return (
    <section className="wrap confirm">
      <div className="grid confirm__grid">
        <div className="confirm__copy">
          <p className="hero__kicker label">{cancelled ? c.cancelledKicker : STATIC ? c.demoKicker : c.kicker}</p>
          <h1 className="display h-xl">{cancelled ? c.cancelledTitle : STATIC ? c.demoTitle : c.title}</h1>
          <p className="lede">{cancelled ? c.cancelledBody : STATIC ? c.demoBody : c.body}</p>
          <p className="alert alert--info small">
            <span>
              <span className="demo-mark">{t.concept.demo}</span> {STATIC ? c.demoPreview : c.preview}
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
            <p>{STATIC ? c.demoNextBody : c.nextBody}</p>
            <p className="close__phones" style={{ gap: '4px 24px' }}>
              {shop.phones.value.map((p) => (
                <a key={p.tel} href={`tel:${p.tel}`} className="link" style={{ color: 'var(--ink)' }}>
                  {p.display}
                </a>
              ))}
              {STATIC && (
                <a href={shop.lineOA.value.url} target="_blank" rel="noopener noreferrer" className="link" style={{ color: 'var(--ink)' }} lang="en">
                  LINE {shop.lineOA.value.id}
                </a>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {!cancelled && (
              <button type="button" className="btn" onClick={() => download(`${order.ref}.ics`, orderIcs(order, lang), 'text/calendar;charset=utf-8')}>
                <span className="btn__diamond" aria-hidden="true" />
                {c.calendar}
              </button>
            )}
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
                  [c.status, STATIC && order.status === 'new' ? c.demoStatus : c.statuses[order.status] ?? c.statusNew],
                  [c.payment, c.payments[order.payment] ?? c.paymentNone],
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
