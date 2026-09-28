'use client';
import { useEffect, useState } from 'react';
import { longDate, type Lang } from '@/content/i18n';
import { adminDict } from '@/content/admin-i18n';
import type { DayLoad } from '@/lib/engine';
import { addDays, rules, todayBangkok, weekday } from '@/lib/rules';
import { adminCapacity } from '@/lib/client-api';
import { BlockToggle } from '@/components/admin/BlockToggle';

/** Five weeks of capacity, loaded in the browser; blocking a day reloads it. */
export function CapacityView({ lang }: { lang: Lang }) {
  const a = adminDict[lang];
  const [data, setData] = useState<{ today: string; days: DayLoad[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () => {
      const t = todayBangkok();
      adminCapacity(addDays(t, -weekday(t)), 35)
        .then((v) => live && (setData(v), setFailed(false)))
        .catch(() => live && setFailed(true));
    };
    load();
    window.addEventListener('lf:data', load);
    return () => {
      live = false;
      window.removeEventListener('lf:data', load);
    };
  }, []);

  if (!data) return <p className="adm-empty" aria-busy={!failed}>{failed ? a.drawer.failed : '…'}</p>;
  const { today, days } = data;
  const start = days[0].date;
  const label = (s: string) => (a.cap as Record<string, string>)[s] ?? s;

  return (
    <>
      <header className="adm__head">
        <div>
          <p className="label">
            {longDate(start, lang)} – {longDate(addDays(start, 34), lang)}
          </p>
          <h1 className="display h-l">{a.cap.title}</h1>
        </div>
      </header>
      <p className="lede adm-lede">{a.cap.lede}</p>
      <div className="adm-cal" role="table" aria-label={a.cap.title}>
        <div role="row" className="adm-cal__wds">
          {a.weekdays.map((w) => (
            <span key={w} role="columnheader">
              {w}
            </span>
          ))}
        </div>
        <div className="adm-cal__grid" role="rowgroup">
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => days.slice(w * 7, w * 7 + 7)).map((week) => (
            <div key={week[0].date} role="row" style={{ display: 'contents' }}>
          {week.map((d) => {
            const past = d.date < today;
            const pct = Math.min(100, Math.round((d.booked / Math.max(1, d.capacity)) * 100));
            const canBlock = d.date > today && d.state !== 'horizon' && d.state !== 'closed';
            return (
              <div key={d.date} role="cell" className="adm-cell" data-state={d.state} data-past={past} data-today={d.date === today}>
                <div className="adm-cell__top">
                  <span className="num adm-cell__d">{Number(d.date.slice(8))}</span>
                  {d.date === today ? <span className="adm-tag">{a.cap.today}</span> : ['full', 'peak', 'blocked', 'closed'].includes(d.state) ? <span className="adm-tag" data-state={d.state}>{label(d.state)}</span> : null}
                </div>
                {!past && d.state !== 'closed' && !d.blocked && (
                  <>
                    <div className="adm-cell__meter" role="img" aria-label={`${d.booked} ${a.cap.ofCapacity} ${d.capacity}`}>
                      <i style={{ width: `${pct}%` }} />
                    </div>
                    <p className="adm-cell__n" aria-hidden="true">
                      <b className="num">{d.booked}</b>/{d.capacity}
                    </p>
                    <ul className="adm-cell__wins" aria-label={a.cap.perWindow}>
                      {d.windows.map((w) => (
                        <li key={w.id} data-full={w.booked >= w.capacity}>
                          <span>{w.from}</span>
                          <span>
                            {w.booked}/{w.capacity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {past && d.booked > 0 && (
                  <p className="adm-cell__n muted">
                    <b className="num">{d.booked}</b>
                  </p>
                )}
                {canBlock && (
                  <BlockToggle
                    date={d.date}
                    dateLabel={longDate(d.date, lang)}
                    blocked={d.blocked}
                    labels={{ block: a.cap.block, unblock: a.cap.unblock, blockShort: a.cap.blockShort, unblockShort: a.cap.unblockShort }}
                  />
                )}
              </div>
            );
          })}
            </div>
          ))}
        </div>
      </div>
      <p className="small adm-lede">
        <span className="demo-mark">{a.demo}</span> {rules.windows.map((w) => `${w.from}–${w.to}`).join(' · ')}
      </p>
    </>
  );
}
