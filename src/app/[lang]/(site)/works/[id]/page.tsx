import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { baht, dict, isLang, langs, longDate, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { colourFamilies, getWork, postUrl, works, worksNewest } from '@/content/works';
import { Photo } from '@/components/Photo';
import { Tag } from '@/components/Tag';
import { WorkCard } from '@/components/WorkCard';
import { Arrow } from '@/components/Icons';
import { keepWords } from '@/lib/thai';

export function generateStaticParams() {
  return langs.flatMap((lang) => works.map((w) => ({ lang, id: w.id })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang, id } = await params;
  const w = getWork(id);
  if (!isLang(lang) || !w) return {};
  return { title: `No. ${String(w.no).padStart(2, '0')} ${w.name[lang]}`, description: w.seen[lang], alternates: { canonical: `/${lang}/works/${id}` } };
}

export default async function WorkPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang: l, id } = await params;
  const w = getWork(id);
  if (!isLang(l) || !w) notFound();
  const lang = l as Lang;
  const t = dict[lang];
  const idx = worksNewest.findIndex((x) => x.id === w.id);
  const prev = worksNewest[idx - 1];
  const next = worksNewest[idx + 1];
  const related = worksNewest
    .filter((x) => x.id !== w.id && x.colours.some((c) => w.colours.includes(c)))
    .sort((a, b) => Number(!!a.lowres) - Number(!!b.lowres))
    .slice(0, 3);
  const captionIsThai = /[฀-๿]/.test(w.caption) && !/[a-z]{4}/.test(w.caption.replace(/Classic Flower Bouquet/, ''));

  return (
    <>
      <section className="wrap pagehead" style={{ paddingBottom: 32 }}>
        <ol className="crumbs" aria-label={lang === 'th' ? 'ตำแหน่งหน้า' : 'Breadcrumb'}>
          <li>
            <Link href={`/${lang}`}>{t.nav.home}</Link>
          </li>
          <li>
            <Link href={`/${lang}/works`}>{t.works.title}</Link>
          </li>
          <li aria-current="page">No. {String(w.no).padStart(2, '0')}</li>
        </ol>
      </section>
      <article className="wrap detail">
        <div className="grid detail__grid">
          <div className="detail__media">
            <div className="detail__frame">
              <Photo work={w} lang={lang} sizes={w.lowres ? '(max-width: 1023px) 88vw, 380px' : '(max-width: 1023px) 88vw, 540px'} priority className={w.lowres ? 'lift photo--lowres' : 'lift'} />
              <Tag />
            </div>
          </div>
          <div className="detail__body">
            <div>
              <p className="detail__no">
                <span className="num">{String(w.no).padStart(2, '0')}</span>
                {w.date && (
                  <span className="label">
                    {t.works.posted} <time dateTime={w.date}>{longDate(w.date, lang)}</time>
                  </span>
                )}
              </p>
              <h1 className="display h-l" style={{ marginTop: 16 }}>
                {w.name[lang]}
              </h1>
            </div>
            {w.caption && (
              <div>
                <p className="label">{t.works.theirWords}</p>
                <p className="caption-quote" lang={captionIsThai ? 'th' : 'en'} style={{ marginTop: 10 }}>
                  “{w.caption}”
                </p>
              </div>
            )}
            <dl className="specs">
              {w.seen[lang] && (
              <div className="spec">
                <dt>{t.works.seen}</dt>
                <dd>
                  {keepWords(w.seen[lang])}
                  <span className="small" style={{ display: 'block', marginTop: 4 }}>
                    {t.works.seenNote}
                  </span>
                </dd>
              </div>
              )}
              <div className="spec">
                <dt>{t.works.filter}</dt>
                <dd style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {w.colours.map((c) => {
                    const f = colourFamilies.find((x) => x.key === c)!;
                    return (
                      <Link key={c} href={`/${lang}/works?colour=${c}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 32 }}>
                        <span className="note-swatch" style={{ ['--note' as string]: f.swatch }} aria-hidden="true" />
                        {f[lang]}
                      </Link>
                    );
                  })}
                </dd>
              </div>
              {w.format !== 'vase' && w.occasion !== 'christmas' && (
                <div className="spec">
                  <dt>{t.works.from[w.format]}</dt>
                  <dd className="num" style={{ fontSize: 22 }}>
                    {baht((w.format === 'box' ? shop.boxFrom : shop.bouquetFrom).value, lang)}
                  </dd>
                </div>
              )}
            </dl>
            <p className="small">{t.works.oneOff[w.format]}</p>
            <div className="detail__ctas">
              <Link href={`/${lang}/order?work=${w.id}`} className="btn">
                <span className="btn__diamond" aria-hidden="true" />
                {t.works.orderStyle}
              </Link>
              <Link href={`/${lang}/order?work=${w.id}&similar=1`} className="btn btn--ghost">
                {t.works.similar}
              </Link>
              {w.source === 'instagram' && (
                <a href={postUrl(w.id)} target="_blank" rel="noopener noreferrer" className="link" style={{ justifySelf: 'start' }}>
                  {t.works.viewOriginal} <Arrow />
                </a>
              )}
            </div>
            <nav className="head__row" aria-label={lang === 'th' ? 'ผลงานอื่น' : 'Other works'} style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              {prev ? (
                <Link href={`/${lang}/works/${prev.id}`} className="link">
                  ← No. {String(prev.no).padStart(2, '0')}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link href={`/${lang}/works/${next.id}`} className="link">
                  No. {String(next.no).padStart(2, '0')} →
                </Link>
              )}
            </nav>
          </div>
        </div>
      </article>
      {related.length > 0 && (
        <section className="wrap section--tight" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="head__row" style={{ marginBottom: 48 }}>
            <h2 className="display h-m">{t.works.more}</h2>
            <Link href={`/${lang}/works`} className="link">
              {t.works.back} <Arrow />
            </Link>
          </div>
          <div className="grid" style={{ rowGap: 48 }}>
            {related.map((r, i) => (
              <div key={r.id} style={{ gridColumn: 'span 4' }} className="related-col">
                <WorkCard work={r} lang={lang} i={i} sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 30vw" />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
