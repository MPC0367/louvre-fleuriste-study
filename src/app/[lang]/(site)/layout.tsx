import { isLang, type Lang } from '@/content/i18n';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ActionBar } from '@/components/ActionBar';
import { Reveal } from '@/components/Reveal';

/** The public shop site: header, footer, mobile action bar. The admin has its own chrome. */
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <>
      <Header lang={lang as Lang} />
      <main id="main">{children}</main>
      <Footer lang={lang as Lang} />
      <ActionBar lang={lang as Lang} />
      <Reveal />
    </>
  );
}
