import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, isLang, type Lang } from '@/content/i18n';
import { Composer } from '@/components/Composer';
import { STATIC } from '@/lib/paths';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict[lang].order.title, alternates: { canonical: `/${lang}/order` } } : {};
}

export default async function Order({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  if (!isLang(l)) notFound();
  const lang = l as Lang;
  const t = dict[lang];
  return (
    <>
      <section className="pagehead wrap" style={{ paddingBottom: 'clamp(24px, 3vw, 40px)' }}>
        <div className="grid pagehead__grid">
          <h1 className="pagehead__title display h-xl">{t.order.title}</h1>
          <p className="pagehead__lede lede">{STATIC ? t.order.demoLede : t.order.lede}</p>
        </div>
      </section>
      <section className="wrap composer">
        <Suspense>
          <Composer lang={lang} />
        </Suspense>
      </section>
    </>
  );
}
