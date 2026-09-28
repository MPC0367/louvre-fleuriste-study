'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { keepWords } from '@/lib/thai';
import { dict, type Lang } from '@/content/i18n';
import { colourFamilies, worksNewest, type ColourFamily } from '@/content/works';
import { WorkCard } from '@/components/WorkCard';

/**
 * The works gallery. The filter lives in the URL (?kind= ?colour= ?occasion=), so a view is shareable and
 * back-button safe. WorksView renders any filter; WorksBrowser reads it from the address bar in the
 * browser, which lets the page be static (it pre-renders the unfiltered gallery).
 */
export function WorksView({ lang, colour, occasion, kind }: { lang: Lang; colour?: string; occasion?: string; kind?: string }) {
  const t = dict[lang];
  const kinds = [
    { key: 'bouquet', th: 'ช่อดอกไม้', en: 'Bouquets' },
    { key: 'box', th: 'กล่องดอกไม้', en: 'Boxes' },
    { key: 'vase', th: 'แจกัน', en: 'Vases' },
  ] as const;
  const kd = kinds.find((k) => k.key === kind)?.key;
  const active = colourFamilies.find((c) => c.key === colour)?.key as ColourFamily | undefined;
  const occ = (['valentines', 'mothers-day', 'christmas'] as const).find((o) => o === occasion);
  const list = worksNewest.filter((w) => (!active || w.colours.includes(active)) && (!occ || w.occasion === occ) && (!kd || w.format === kd));
  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { colour: active, occasion: occ, kind: kd, ...patch };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    const str = p.toString();
    return `/${lang}/works${str ? `?${str}` : ''}`;
  };
  const activeSwatch = colourFamilies.find((c) => c.key === active);

  return (
    <>
      <section className="pagehead pagehead--index wrap">
        <ol className="crumbs" aria-label={lang === 'th' ? 'ตำแหน่งหน้า' : 'Breadcrumb'}>
          <li>
            <Link href={`/${lang}`}>{t.nav.home}</Link>
          </li>
          <li aria-current="page">{t.works.title}</li>
        </ol>
        <div className="grid pagehead__grid">
          <h1 className="pagehead__title display h-xl">{t.works.title}</h1>
          <p className="pagehead__lede lede">{keepWords(t.works.lede)}</p>
        </div>
      </section>
      <section className="wrap" aria-label={t.works.filter}>
        <div className="head__row" style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)', marginBottom: 'clamp(24px, 5vw, 72px)' }}>
          <div className="gallery__filters">
            <nav className="filters" aria-label={lang === 'th' ? 'ประเภท' : 'Kind'}>
              <Link href={q({ kind: undefined })} className="chip" aria-current={!kd ? 'true' : undefined} scroll={false}>
                {t.works.all}
              </Link>
              {kinds.map((k) => (
                <Link key={k.key} href={q({ kind: k.key })} className="chip" aria-current={kd === k.key ? 'true' : undefined} scroll={false}>
                  {k[lang]} <span className="chip__n">{worksNewest.filter((w) => w.format === k.key).length}</span>
                </Link>
              ))}
            </nav>
            <nav className="filters" aria-label={t.works.filter}>
              {colourFamilies.map((c) => {
                const n = worksNewest.filter((w) => w.colours.includes(c.key)).length;
                if (!n) return null;
                return (
                  <Link key={c.key} href={q({ colour: active === c.key ? undefined : c.key })} className="chip" aria-current={active === c.key ? 'true' : undefined} scroll={false}>
                    <span className="note-swatch" style={{ ['--note' as string]: c.swatch }} aria-hidden="true" />
                    {c[lang]}
                  </Link>
                );
              })}
              {(['valentines', 'mothers-day', 'christmas'] as const).map((o) => (
                <Link key={o} href={q({ occasion: occ === o ? undefined : o })} className="chip" aria-current={occ === o ? 'true' : undefined} scroll={false}>
                  <span className="btn__diamond" aria-hidden="true" />
                  {t.occasions[o]}
                </Link>
              ))}
            </nav>
          </div>
          <p className="small" aria-live="polite" style={{ flexBasis: '100%' }}>
            {t.works.count(list.length)}
            {activeSwatch && ` · ${activeSwatch[lang]}`}
            {occ && ` · ${t.occasions[occ]}`}
          </p>
        </div>
      </section>
      <section className="wrap" style={{ paddingBottom: 'clamp(96px, 12vw, 184px)' }}>
        {list.length ? (
          <div className="gallery">
            {list.map((w, i) => (
              <WorkCard key={w.id} work={w} lang={lang} i={i} sizes="(max-width: 767px) 46vw, 304px" />
            ))}
          </div>
        ) : (
          <p className="lede">{t.works.none}</p>
        )}
      </section>
    </>
  );
}

export function WorksBrowser({ lang }: { lang: Lang }) {
  const q = useSearchParams();
  return <WorksView lang={lang} colour={q.get('colour') ?? undefined} occasion={q.get('occasion') ?? undefined} kind={q.get('kind') ?? undefined} />;
}
