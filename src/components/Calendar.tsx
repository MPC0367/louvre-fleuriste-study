'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dict, type Lang } from '@/content/i18n';
import { addDays, rules, todayBangkok, type DayState } from '@/lib/rules';
import { Arrow } from './Icons';

export interface Day {
  date: string;
  state: DayState;
  left: number;
  windows: { id: string; from: string; to: string; left: number }[];
  reason?: { th: string; en: string };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A native month calendar. States come from the server; nothing impossible can be picked.
 * Arrow keys move between days (roving tabindex), Home/End jump to the week's ends.
 */
export function Calendar({
  lang,
  days,
  loading,
  selected,
  onPick,
  onMonth,
  describedBy,
}: {
  lang: Lang;
  days: Record<string, Day>;
  loading: boolean;
  selected: string | null;
  onPick: (iso: string) => void;
  onMonth: (gridStart: string) => void;
  describedBy?: string;
}) {
  const t = dict[lang];
  const today = todayBangkok();
  const initial = selected ?? addDays(today, rules.leadDays);
  const [ym, setYm] = useState(() => initial.slice(0, 7));
  const [focus, setFocus] = useState<string>(initial);
  const gridRef = useRef<HTMLDivElement>(null);
  // Set by the arrow keys: when they cross into another month, the old grid (and its focus) is gone.
  const kbd = useRef(false);

  const [y, m] = ym.split('-').map(Number);
  const first = `${ym}-01`;
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const gridStart = addDays(first, -lead);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = Math.ceil((lead + dim) / 7);
  const cells = useMemo(() => Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i)), [gridStart, weeks]);
  const minYm = today.slice(0, 7);
  const maxYm = addDays(today, rules.horizonDays).slice(0, 7);

  useEffect(() => onMonth(gridStart), [gridStart, onMonth]);

  const move = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const next = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
    if (next < minYm || next > maxYm) return;
    setYm(next);
    setFocus(`${next}-01`);
  };

  const pickable = (iso: string) => {
    const s = days[iso]?.state;
    return s === 'open' || s === 'peak';
  };

  function onKey(e: React.KeyboardEvent) {
    const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let n: string | null = null;
    if (e.key in map) n = addDays(focus, map[e.key]);
    if (e.key === 'Home') n = addDays(focus, -new Date(focus + 'T00:00:00Z').getUTCDay());
    if (e.key === 'End') n = addDays(focus, 6 - new Date(focus + 'T00:00:00Z').getUTCDay());
    if (!n) return;
    e.preventDefault();
    kbd.current = true;
    if (n.slice(0, 7) !== ym) {
      if (n.slice(0, 7) < minYm || n.slice(0, 7) > maxYm) return;
      setYm(n.slice(0, 7));
    }
    setFocus(n);
  }

  useEffect(() => {
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`);
    if (el && (kbd.current || gridRef.current?.contains(document.activeElement))) el.focus();
    kbd.current = false;
  }, [focus, ym]);

  const stateLabel = (s: DayState) => t.order.dayState[s as keyof typeof t.order.dayState];

  return (
    <div className="cal">
      <div className="cal__head">
        <button type="button" className="cal__nav cal__nav--prev" onClick={() => move(-1)} disabled={ym <= minYm} aria-label={t.order.calPrev}>
          <Arrow />
        </button>
        <p className="cal__month" aria-live="polite">
          {t.months[m - 1]} <span className="num">{y}</span>
          {t.yearNote && <span className="small"> ({t.yearNote})</span>}
        </p>
        <button type="button" className="cal__nav" onClick={() => move(1)} disabled={ym >= maxYm} aria-label={t.order.calNext}>
          <Arrow />
        </button>
      </div>
      <div className="cal__grid" role="grid" aria-label={`${t.months[m - 1]} ${y}`} aria-busy={loading} ref={gridRef} onKeyDown={onKey}>
        <div className="cal__row" role="row">
          {t.weekdays.map((w) => (
            <span key={w} className="cal__wd" role="columnheader">
              {w}
            </span>
          ))}
        </div>
        {Array.from({ length: weeks }, (_, r) => (
          <div className="cal__row" role="row" key={r}>
        {cells.slice(r * 7, r * 7 + 7).map((iso) => {
          const inMonth = iso.slice(0, 7) === ym;
          const info = days[iso];
          const state: DayState = info?.state ?? (iso <= today ? 'past' : 'lead');
          const can = pickable(iso);
          const sel = selected === iso;
          const d = Number(iso.slice(8));
          const small = !inMonth
            ? ''
            : state === 'full' || state === 'closed' || state === 'peak'
              ? stateLabel(state)
              : can && info && info.left <= 3
                ? t.order.windowLeft(info.left)
                : '';
          const label = `${d} ${t.months[Number(iso.slice(5, 7)) - 1]} — ${info ? stateLabel(state) : t.order.loadingDays}`;
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className="cal__day"
              data-date={iso}
              data-state={inMonth ? (info ? state : 'lead') : 'past'}
              data-today={iso === today}
              aria-selected={sel}
              aria-describedby={iso === focus ? describedBy : undefined}
              aria-disabled={!can}
              aria-label={label}
              tabIndex={iso === focus ? 0 : -1}
              style={{ visibility: inMonth ? 'visible' : 'hidden' }}
              onClick={() => {
                setFocus(iso);
                if (can) onPick(iso);
              }}
            >
              <span>{d}</span>
              {small && <small>{small}</small>}
            </button>
          );
        })}
          </div>
        ))}
      </div>
      <div className="cal__legend" aria-hidden="true">
        <span>
          <i style={{ background: 'var(--navy)' }} /> {lang === 'th' ? 'วันที่เลือก' : 'Selected'}
        </span>
        <span>
          <i style={{ background: 'repeating-linear-gradient(135deg, transparent 0 3px, rgba(20,28,46,.25) 3px 4px)' }} /> {t.order.dayState.full} / {t.order.dayState.closed}
        </span>
        {loading && <span>{t.order.loadingDays}…</span>}
      </div>
    </div>
  );
}
