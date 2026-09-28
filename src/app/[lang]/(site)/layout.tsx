import { isLang, type Lang } from '@/content/i18n';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ActionBar } from '@/components/ActionBar';
import { Reveal } from '@/components/Reveal';

/**
 * The public shop site: header, footer, mobile action bar. The admin has its own chrome.
 * The action bar is fixed to the screen, so its place in the markup doesn't move it; it comes before the
 * footer so the O2 studio credit stays the last link on the page (context/patterns/studio-credit.md).
 */
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <>
      <Header lang={lang as Lang} />
      <main id="main">{children}</main>
      <ActionBar lang={lang as Lang} />
      <Footer lang={lang as Lang} />
      <Reveal />
    </>
  );
}
