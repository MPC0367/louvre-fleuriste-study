'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { dict, type Lang } from '@/content/i18n';
import { more } from '@/content/i18n-more';
import type { Work } from '@/content/works';
import { todayBangkok } from '@/lib/rules';
import { Photo } from './Photo';
import { LogoMark } from './Logo';
import { Arrow } from './Icons';

export type Occasion = {
  key: 'valentines' | 'mothers-day' | 'christmas';
  month: number;
  day: number;
  col: string;
  work: Work | null;
  img: { src: string; alt: string; pos?: string } | null;
  when: string;
};

/** Days from today to each occasion's next date, nearest first. Dates are Bangkok calendar days. */
function nextOccasion(today: string, occasions: Occasion[]) {
  const nowMonth = Number(today.slice(5, 7));
  const tDate = Date.UTC(+today.slice(0, 4), nowMonth - 1, +today.slice(8, 10));
  const next = occasions
    .map((o) => {
      let y = +today.slice(0, 4);
      let d = Date.UTC(y, o.month - 1, o.day);
      if (d < tDate) d = Date.UTC(++y, o.month - 1, o.day);
      return { key: o.key, days: Math.round((d - tDate) / 86400000) };
    })
    .sort((a, b) => a.days - b.days)[0];
  return { nowMonth, next };
}

/**
 * Section 05, a florist's year. The page may be pre-built (the static demo), so the "now" month and the
 * countdown are worked out again in the browser from the visitor's date; the build date only fills the
 * first paint.
 */
export function YearSection({ lang, occasions, builtOn }: { lang: Lang; occasions: Occasion[]; builtOn: string }) {
  const t = dict[lang];
  const m = more[lang];
  const [today, setToday] = useState(builtOn);
  useEffect(() => setToday(todayBangkok()), []);
  const { nowMonth, next: nextOcc } = nextOccasion(today, occasions);

  return (
  <section className="year" aria-labelledby="occ-title">
    <div className="wrap">
      <div className="year__head">
        <div className="head" style={{ marginBottom: 0 }}>
          <p className="head__kicker label reveal">
            <span className="num">05</span> {m.year.kicker}
          </p>
          <h2 id="occ-title" className="display h-l reveal">
            {m.year.title}
          </h2>
        </div>
        <p className="year__next reveal">
          <span className="label">{m.year.next}</span>
          <span className="year__count num">{nextOcc.days === 0 ? m.year.today : nextOcc.days}</span>
          <span className="year__nextname">
            {nextOcc.days === 0 ? t.occasions[nextOcc.key] : <>{m.year.days(nextOcc.days)} · {t.occasions[nextOcc.key]}</>}
          </span>
        </p>
      </div>
      <ol className="year__rail" aria-hidden="true">
        {m.monthsShort.map((mo, i) => {
          const o = occasions.find((x) => x.month === i + 1);
          return (
            <li key={mo} data-now={i + 1 === nowMonth} data-occ={!!o}>
              <span>{mo}</span>
              {i + 1 === nowMonth && <b>{m.year.now}</b>}
            </li>
          );
        })}
      </ol>
      <div className="year__cards">
        {occasions.map((o, i) => (
          <article key={o.key} className="yearcard reveal" style={{ ['--i' as string]: i, ['--col' as string]: o.col }} data-next={o.key === nextOcc.key} data-occasion={o.key}>
            <Link href={o.work || o.img ? `/${lang}/works?occasion=${o.key}` : `/${lang}/order?occasion=${o.key}`} className="yearcard__link">
              <span className="yearcard__media">
                {o.work ? (
                  <Photo work={o.work} lang={lang} sizes={o.work.w / o.work.h > 0.8 ? '(max-width: 767px) 88vw, (max-width: 1439px) 37vw, 530px' : '(max-width: 767px) 88vw, (max-width: 1439px) 30vw, 440px'} ar="4 / 5" />
                ) : o.img ? (
                  <Image src={o.img.src} alt={o.img.alt} fill sizes="(max-width: 767px) 100vw, (max-width: 1439px) 43vw, 616px" quality={82} style={{ objectFit: 'cover', objectPosition: o.img.pos ?? '50% 50%' }} />
                ) : (
                  <span className="yearcard__plate">
                    <LogoMark className="yearcard__lattice" />
                    <span className="small">{m.year.pending}</span>
                  </span>
                )}
              </span>
              <span className="yearcard__top">
                <span className="num yearcard__mo">{String(o.month).padStart(2, '0')}</span>
                <span className="yearcard__when">{o.when}</span>
              </span>
              <span className="yearcard__bottom">
                <span className="yearcard__name">{t.occasions[o.key]}</span>
                <span className="yearcard__cta">
                  {o.work || o.img ? m.year.see : m.year.order} <Arrow />
                </span>
              </span>
              {o.key === nextOcc.key && <span className="yearcard__badge">{m.year.inDays(nextOcc.days)}</span>}
            </Link>
          </article>
        ))}
      </div>
    </div>
  </section>
  );
}
