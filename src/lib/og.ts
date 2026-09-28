import type { Metadata } from 'next';
import type { Lang } from '@/content/i18n';

/**
 * Link-preview basics (LINE, Facebook, X). Next.js replaces a parent's openGraph with a child's whole,
 * so every page that sets its own openGraph spreads this. /og.jpg is written by the static build
 * (scripts/build-pages.mjs) and resolves against metadataBase.
 */
export const ogBase = (lang: Lang): NonNullable<Metadata['openGraph']> => ({
  siteName: 'Louvre Fleuriste',
  locale: lang === 'th' ? 'th_TH' : 'en_US',
  type: 'website',
  images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Louvre Fleuriste' }],
});
