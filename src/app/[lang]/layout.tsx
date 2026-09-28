import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Sans_Thai, Jost, Noto_Serif_Thai } from 'next/font/google';
import '@/styles/globals.css';
import { Suspense } from 'react';
import { PageLoader } from '@/components/PageLoader';
import { Enhance } from '@/components/Enhance';
import { dict, isLang, langs, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';

const fraunces = Fraunces({ subsets: ['latin'], axes: ['opsz', 'SOFT'], style: ['normal', 'italic'], variable: '--font-fraunces', display: 'swap' });
const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex', display: 'swap' });
const plexThai = IBM_Plex_Sans_Thai({ subsets: ['thai'], weight: ['400', '500'], variable: '--font-plex-thai', display: 'swap' });
const jost = Jost({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jost', display: 'swap' });
const serifThai = Noto_Serif_Thai({ subsets: ['thai'], weight: ['300', '400'], variable: '--font-serif-thai', display: 'swap' });

export function generateStaticParams() {
  return langs.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict[lang];
  return {
    title: { default: t.htmlTitle, template: `%s — Louvre Fleuriste` },
    description: t.metaDescription,
    // A demo: never indexed. Canonical on the demo's own address (GitHub Pages) or a placeholder domain locally.
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://louvre-fleuriste.example'),
    alternates: { canonical: `/${lang}`, languages: { th: '/th', en: '/en' } },
    openGraph: { title: t.htmlTitle, description: t.metaDescription, locale: lang === 'th' ? 'th_TH' : 'en_US', type: 'website' },
  };
}

export const viewport: Viewport = { themeColor: '#f4f1ec', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict[lang as Lang];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Florist',
    name: shop.name.value,
    alternateName: shop.nameTh.value,
    disambiguatingDescription: 'Demo website by O2 Design Studio for Louvre Fleuriste. Orders placed on this site are a demonstration and are not sent to the shop.',
    telephone: shop.phones.value.map((p) => p.tel),
    areaServed: 'Bangkok',
    priceRange: `฿${shop.boxFrom.value.toLocaleString('en-US')}+`,
    sameAs: [shop.instagram.value, shop.facebook.value],
  };
  return (
    <html lang={lang} suppressHydrationWarning className={`${fraunces.variable} ${plex.variable} ${plexThai.variable} ${serifThai.variable} ${jost.variable}`}>
      <head>
        {/* Louvre Fleuriste — demo website by O2 Design Studio, made with the shop's approval. Orders here are a demonstration. Photographs belong to the shop. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <a className="skip" href="#main">{t.skip}</a>
        <aside className="concept" aria-label={t.concept.demo}>{t.concept.bar}</aside>
        {children}
        <PageLoader />
        <Suspense>
          <Enhance />
        </Suspense>
      </body>
    </html>
  );
}
