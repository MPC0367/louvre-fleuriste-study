import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLang, type Lang } from '@/content/i18n';
import { adminDict } from '@/content/admin-i18n';
import { adminAllowed } from '@/lib/admin-guard';
import { AdminNav } from '@/components/admin/AdminNav';
import { O2Credit } from '@/components/O2Credit';
import { Logo } from '@/components/Logo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  // No automatic phone links on iOS: the sample orders' numbers are invented.
  return { title: isLang(lang) ? adminDict[lang].title : 'Admin', robots: { index: false, follow: false }, formatDetection: { telephone: false } };
}

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang) || !adminAllowed()) notFound();
  const a = adminDict[lang as Lang];
  return (
    <div className="adm">
      <aside className="adm__side on-ink">
        <div className="adm__brand">
          <Logo className="logo--admin" />
          <span className="adm__role">{a.title}</span>
        </div>
        <AdminNav lang={lang as Lang} />
        <div className="adm__sidefoot">
          <p className="adm__demo">
            <span className="demo-mark">{a.demo}</span>
            <span>{a.demoNote}</span>
          </p>
          <O2Credit />
        </div>
      </aside>
      <main id="main" className="adm__main">
        {children}
        <footer className="adm__foot">
          <O2Credit />
        </footer>
      </main>
    </div>
  );
}
