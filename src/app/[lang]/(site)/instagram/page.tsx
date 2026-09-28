import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, isLang, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { keepWords } from '@/lib/thai';
import { igNewest, photo } from '@/content/works';
import { Feed, FeedGrid } from '@/components/Feed';
import { imgUrl } from '@/lib/paths';

/**
 * A shared post link (?post=): start downloading its photo while the page is still being read. Phones and
 * desktops only: on tablets the lightbox picks a size from the panel height, which a preload cannot know.
 */
const lightboxSets = Object.fromEntries(igNewest.map((w) => [w.id, [640, 1080, 1440].map((x) => `${imgUrl(photo(w.id), x, 85)} ${x}w`).join(', ')]));
const preloadPost = `(function(){var m=${JSON.stringify(lightboxSets)},id=new URLSearchParams(location.search).get('post');if(!id||!Object.prototype.hasOwnProperty.call(m,id))return;var l=document.createElement('link');l.rel='preload';l.as='image';l.fetchPriority='high';l.imageSrcset=m[id];l.imageSizes='min(640px, calc(100vw - 32px))';l.media='(max-width: 639px), (min-width: 900px)';document.head.appendChild(l)})()`;
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
      <script dangerouslySetInnerHTML={{ __html: preloadPost }} />
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
        <Suspense fallback={<FeedGrid works={igNewest} lang={lang as Lang} />}>
          <Feed works={igNewest} lang={lang} />
        </Suspense>
      </section>
    </>
  );
}
