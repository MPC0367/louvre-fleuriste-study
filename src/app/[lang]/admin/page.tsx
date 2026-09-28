import Image from 'next/image';
import Link from 'next/link';
import { baht, dict, longDate, type Lang } from '@/content/i18n';
import { adminDict } from '@/content/admin-i18n';
import { colourFamilies, getWork, photo } from '@/content/works';
import { getAdminOrder, listOrders, loadRange, STATUSES, summary, type AdminOrder } from '@/lib/admin';
import { rules, todayBangkok, TZ } from '@/lib/rules';
import { OrderActions } from '@/components/admin/OrderActions';
import { DrawerFocus } from '@/components/admin/DrawerFocus';
import { Close, Phone } from '@/components/Icons';


export const dynamic = 'force-dynamic';
type SP = { status?: string; date?: string; q?: string; range?: string; order?: string };

/** Orders. Every filter and the open order live in the URL, so any view can be linked or captured. */
export default async function AdminOrders({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<SP> }) {
  const { lang: l } = await params;
  const lang = l as Lang;
  const a = adminDict[lang];
  const sp = await searchParams;
  const range = sp.range === 'past' ? 'past' : 'upcoming';
  const status = sp.status ?? 'open';
  const orders = listOrders({ status, date: sp.date, q: sp.q, range: range as 'past' | 'upcoming' });
  const sum = summary();
  const today = todayBangkok();
  const strip = loadRange(today, 14);
  const open = sp.order ? getAdminOrder(sp.order) : undefined;
  const base = `/${lang}/admin`;

  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    if (merged.status === 'open') p.delete('status');
    if (merged.range === 'upcoming') p.delete('range');
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };

  const groups = new Map<string, AdminOrder[]>();
  for (const o of orders) groups.set(o.date, [...(groups.get(o.date) ?? []), o]);
  const win = (id: string) => rules.windows.find((w) => w.id === id)!;
  const wd = (iso: string) => a.weekdays[new Date(iso + 'T00:00:00Z').getUTCDay()];

  return (
    <>
      <header className="adm__head">
        <div>
          <p className="label">
            {a.today} · {wd(today)} {longDate(today, lang)}
          </p>
          <h1 className="display h-l">{a.nav.orders}</h1>
        </div>
        <a className="btn btn--ghost adm-btn-s" href={`/api/admin/export?${new URLSearchParams(Object.entries({ status: sp.status ?? '', date: sp.date ?? '', q: sp.q ?? '', range: sp.range ?? '' }).filter(([, v]) => v))}`} download>
          {a.export}
        </a>
      </header>

      <dl className="adm-sum">
        {(
          [
            ['awaiting', sum.awaiting, href({ status: 'new', date: undefined, range: undefined })],
            ['today', sum.today, href({ date: today, status: 'open' })],
            ['todayDelivery', sum.todayDelivery, href({ date: today, status: 'open' })],
            ['unpaid', sum.unpaid, null],
            ['next7', sum.next7, null],
          ] as [keyof typeof a.summary, number, string | null][]
        ).map(([k, n, h]) => (
          <div key={k} className="adm-sum__item" data-alert={k === 'awaiting' && n > 0}>
            <dt>{a.summary[k]}</dt>
            <dd className="num">{h ? <Link href={h}>{n}</Link> : n}</dd>
          </div>
        ))}
      </dl>

      <section aria-label={a.next14} className="adm-strip-wrap">
        <p className="label">{a.next14}</p>
        <ol className="adm-strip">
          {strip.map((d) => {
            const pct = Math.min(100, Math.round((d.booked / Math.max(1, d.capacity)) * 100));
            return (
              <li key={d.date}>
                <Link href={href({ date: sp.date === d.date ? undefined : d.date, range: undefined })} className="adm-day" aria-current={sp.date === d.date ? 'true' : undefined} data-state={d.state}>
                  <span className="adm-day__wd">{d.date === today ? a.today : wd(d.date)}</span>
                  <span className="adm-day__d num">{Number(d.date.slice(8))}</span>
                  <span className="adm-day__bar" aria-hidden="true">
                    <i style={{ height: `${pct}%` }} />
                  </span>
                  <span className="adm-day__n">{d.blocked ? a.cap.blocked : a.booked(d.booked, d.capacity)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="adm-filters">
        <nav className="filters" aria-label={a.cols.status}>
          <Link href={href({ status: 'open' })} className="chip" aria-current={status === 'open' ? 'true' : undefined}>
            {a.filters.open}
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={href({ status: s })} className="chip" aria-current={status === s ? 'true' : undefined}>
              <span className="adm-dot" data-status={s} aria-hidden="true" />
              {a.status[s]}
            </Link>
          ))}
          <Link href={href({ status: 'all' })} className="chip" aria-current={status === 'all' ? 'true' : undefined}>
            {a.filters.all}
          </Link>
        </nav>
        <div className="adm-filters__row">
          <nav className="filters" aria-label={a.filters.upcoming}>
            <Link href={href({ range: 'upcoming', date: undefined })} className="chip" aria-current={range === 'upcoming' && !sp.date ? 'true' : undefined}>
              {a.filters.upcoming}
            </Link>
            <Link href={href({ range: 'past', date: undefined })} className="chip" aria-current={range === 'past' && !sp.date ? 'true' : undefined}>
              {a.filters.past}
            </Link>
            {sp.date && (
              <Link href={href({ date: undefined })} className="chip" aria-current="true">
                {wd(sp.date)} {longDate(sp.date, lang)} ×
              </Link>
            )}
          </nav>
          <form className="adm-search" action={base} role="search">
            {sp.status && <input type="hidden" name="status" value={sp.status} />}
            {sp.range && <input type="hidden" name="range" value={sp.range} />}
            <input className="input" type="search" name="q" defaultValue={sp.q ?? ''} placeholder={a.filters.search} aria-label={a.filters.search} />
            <button className="btn adm-btn-s" type="submit">
              {a.filters.go}
            </button>
          </form>
        </div>
        <p className="small" aria-live="polite">
          {a.count(orders.length)}
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="adm-empty">{a.none}</p>
      ) : (
        [...groups.entries()].map(([date, list]) => (
          <section key={date} className="adm-group" aria-labelledby={`g-${date}`}>
            <h2 id={`g-${date}`} className="adm-group__h">
              <span>
                {date === today ? `${a.today} · ` : ''}
                {wd(date)} {longDate(date, lang)}
              </span>
              <span className="small">{a.count(list.length)}</span>
            </h2>
            <ul className="adm-list">
              {list.map((o) => {
                const w = o.work_id ? getWork(o.work_id) : undefined;
                const wi = win(o.window_id);
                return (
                  <li key={o.ref}>
                    <Link href={href({ order: o.ref })} className="adm-order" aria-current={open?.ref === o.ref ? 'true' : undefined} scroll={false}>
                      <span className="adm-order__time num">
                        {wi.from}
                        <small>–{wi.to}</small>
                      </span>
                      <span className="adm-order__thumb" aria-hidden="true">
                        {w ? <Image src={photo(w.id)} alt="" width={48} height={48} sizes="48px" /> : <span className="adm-order__plate">{a.kind[o.kind]}</span>}
                      </span>
                      <span className="adm-order__who">
                        <b>{o.sender_name}</b>
                        <small lang="en">{o.ref}</small>
                      </span>
                      <span className="adm-order__what">
                        <span>
                          {a.kind[o.kind]} · <span className="num">{baht(o.budget, lang)}</span>
                        </span>
                        <small>
                          {a.method[o.method]}
                          {o.method === 'delivery' && o.district ? ` · ${o.district}` : ''}
                        </small>
                      </span>
                      <span className="adm-pill adm-pill--static" data-status={o.status}>
                        {a.status[o.status]}
                      </span>
                      <span className="adm-pill adm-pill--static" data-pay={o.payment}>
                        {a.payment[o.payment]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {open && <Drawer o={open} lang={lang} closeHref={href({ order: undefined })} />}
      {open && <Link href={href({ order: undefined })} className="adm-scrim" aria-hidden="true" tabIndex={-1} scroll={false} />}
    </>
  );
}

function Drawer({ o, lang, closeHref }: { o: AdminOrder; lang: Lang; closeHref: string }) {
  const a = adminDict[lang];
  const d = a.drawer;
  const t = dict[lang];
  const w = o.work_id ? getWork(o.work_id) : undefined;
  const wi = rules.windows.find((x) => x.id === o.window_id)!;
  const colour = o.colour === 'any' ? t.order.colourAny : colourFamilies.find((c) => c.key === o.colour)?.[lang];
  const occ = o.occasion ? ((t.occasions as unknown as Record<string, string>)[o.occasion] ?? o.occasion) : null;
  const wd = a.weekdays[new Date(o.date + 'T00:00:00Z').getUTCDay()];
  const tel = (p: string | null) => (p ? `+66${p.replace(/\D/g, '').replace(/^0/, '')}` : '');
  const fmt = (p: string | null) => (p ? p.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d+)$/, '$1 $2 $3') : '');
  const placedAt = (iso: string) => {
    const at = new Date(iso);
    const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
    return `${longDate(todayBangkok(at), lang)} · ${hm}`;
  };
  const rows: [string, React.ReactNode][] = [
    [d.when, `${wd} ${longDate(o.date, lang)} · ${wi.from}–${wi.to}`],
    [d.what, `${a.kind[o.kind]} · ${baht(o.budget, lang)}`],
    ...(colour ? [[d.colour, colour] as [string, string]] : []),
    ...(occ ? [[d.occasion, occ] as [string, string]] : []),
    ...(o.flowers ? [[d.flowers, o.flowers] as [string, string]] : []),
  ];
  return (
    <aside className="adm-drawer" aria-labelledby="drawer-title" role="dialog" aria-modal="true">
      <DrawerFocus closeHref={closeHref} orderRef={o.ref} discard={d.discard} />
      <div className="adm-drawer__head">
        <div>
          <p className="label">
            {o.seed ? <span className="demo-mark">{d.sample}</span> : null} {d.placed} {placedAt(o.created_iso)}
          </p>
          <h2 id="drawer-title" className="adm-drawer__ref" lang="en">
            {o.ref}
          </h2>
        </div>
        <Link href={closeHref} className="lightbox__close adm-close" aria-label={d.close} scroll={false}>
          <Close />
        </Link>
      </div>

      <OrderActions lang={lang} orderRef={o.ref} status={o.status} payment={o.payment} notes={o.internal_notes ?? ''} />

      {w && (
        <div className="adm-work">
          <Image src={photo(w.id)} alt="" width={96} height={96} sizes="96px" />
          <div>
            <p className="label">{d.style}</p>
            <p>
              No. {String(w.no).padStart(2, '0')} {w.name[lang]}
            </p>
            <p className="small">{w.seen[lang]}</p>
          </div>
        </div>
      )}

      <dl className="adm-dl">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {o.upload_id && (
          <div>
            <dt>{d.reference}</dt>
            <dd>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="adm-ref" src={`/api/admin/uploads/${o.upload_id}`} alt={d.reference} />
            </dd>
          </div>
        )}
      </dl>

      <dl className="adm-dl">
        <div>
          <dt>{a.method[o.method]}</dt>
          <dd>
            {o.method === 'delivery' ? (
              <>
                <b>{o.recipient_name}</b>
                {o.recipient_phone && (
                  <>
                    {' '}
                    · <a href={`tel:${tel(o.recipient_phone)}`}>{fmt(o.recipient_phone)}</a>
                  </>
                )}
                <br />
                {o.address}
                <br />
                {[o.subdistrict, o.district, o.province, o.postcode].filter(Boolean).join(' ')}
                {o.instructions && <span className="small adm-block-line">{d.driver}: {o.instructions}</span>}
                <span className="small adm-block-line">{d.fee}</span>
              </>
            ) : (
              <>{o.recipient_name ?? '—'}</>
            )}
          </dd>
        </div>
        <div>
          <dt>{d.sender}</dt>
          <dd>
            <b>{o.sender_name}</b> · <a href={`tel:${tel(o.sender_phone)}`}>{fmt(o.sender_phone)}</a>
            {o.email && (
              <>
                <br />
                {o.email}
              </>
            )}
            <span className="small adm-block-line">
              {d.via}: {o.lang === 'th' ? 'ไทย' : 'English'}
            </span>
          </dd>
        </div>
        {o.notes && (
          <div>
            <dt>{d.notes}</dt>
            <dd>{o.notes}</dd>
          </div>
        )}
      </dl>

      {o.card && (
        <figure className="adm-card">
          <figcaption className="label">{d.card}</figcaption>
          <blockquote>{o.card}</blockquote>
        </figure>
      )}

      <div className="adm-drawer__foot">
        <a className="btn" href={`tel:${tel(o.sender_phone)}`}>
          <Phone /> {d.call} {o.sender_name}
        </a>
      </div>
    </aside>
  );
}
