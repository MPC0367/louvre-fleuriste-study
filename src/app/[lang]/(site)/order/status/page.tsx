import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLang, type Lang } from '@/content/i18n';
import { OrderStatus } from '@/components/OrderStatus';

export const metadata: Metadata = { title: 'Order', robots: { index: false, follow: false } };

/** The confirmation page. Static: the order is looked up in the browser from the link's ?ref= and ?t=. */
export default async function Confirmation({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Suspense fallback={<section className="wrap confirm" aria-busy="true" />}>
      <OrderStatus lang={lang as Lang} />
    </Suspense>
  );
}
