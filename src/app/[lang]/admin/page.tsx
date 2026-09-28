import { Suspense } from 'react';
import type { Lang } from '@/content/i18n';
import { OrdersView } from '@/components/admin/OrdersView';

/** Orders. A static shell: the orders load in the browser (components/admin/OrdersView.tsx). */
export default async function AdminOrders({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <Suspense fallback={<p className="adm-empty" aria-busy="true">…</p>}>
      <OrdersView lang={lang as Lang} />
    </Suspense>
  );
}
