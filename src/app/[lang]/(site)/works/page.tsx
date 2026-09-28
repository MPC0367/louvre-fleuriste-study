import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, isLang, type Lang } from '@/content/i18n';
import { WorksBrowser, WorksView } from '@/components/WorksBrowser';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict[lang].works.title, alternates: { canonical: `/${lang}/works` } } : {};
}

/** Static: the page carries the whole gallery; the browser applies the filter from the URL. */
export default async function Works({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Suspense fallback={<WorksView lang={lang as Lang} />}>
      <WorksBrowser lang={lang as Lang} />
    </Suspense>
  );
}
