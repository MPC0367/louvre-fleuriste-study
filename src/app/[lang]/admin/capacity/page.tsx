import type { Lang } from '@/content/i18n';
import { CapacityView } from '@/components/admin/CapacityView';

/** Capacity. A static shell: the calendar loads in the browser (components/admin/CapacityView.tsx). */
export default async function Capacity({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <CapacityView lang={lang as Lang} />;
}
