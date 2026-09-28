import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, isLang, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { keepWords } from '@/lib/thai';
import { igNewest } from '@/content/works';
import { Feed } from '@/components/Feed';
import { Arrow } from '@/components/Icons';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict[lang].ig.title, alternates: { canonical: `/${lang}/instagram` } } : {};
}

export default async function Instagram({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  if (!isLang(l)) notFound();
  const lang = l as Lang;
  const t = dict[lang];
  return (
    <>
      <section className="pagehead pagehead--index wrap">
        <div className="grid pagehead__grid">
          <h1 className="pagehead__title display h-xl">{t.ig.title}</h1>
          <p className="pagehead__lede lede">{keepWords(t.ig.lede)}</p>
        </div>
      </section>
      <section className="wrap" style={{ paddingBottom: 'clamp(96px, 12vw, 184px)' }}>
        <div className="igprofile">
          <p className="igprofile__handle" lang="en">
            @louvrefleuriste
          </p>
          <p className="small">
            {t.ig.followers} <span className="muted">· {t.ig.followersNote}</span>
          </p>
          <div className="highlights" role="group" aria-label={t.ig.highlights}>
            {shop.highlights.value.map((h) => (
              <span key={h} className="highlight" lang="en">
                {h}
              </span>
            ))}
          </div>
          <a href={shop.instagram.value} target="_blank" rel="noopener noreferrer" className="link" style={{ marginLeft: 'auto' }}>
            {t.feed.open} <Arrow />
          </a>
        </div>
        <Suspense>
          <Feed works={igNewest} lang={lang} />
        </Suspense>
      </section>
    </>
  );
}
