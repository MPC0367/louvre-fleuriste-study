'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { dict, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { Phone } from './Icons';

/** Slim mobile bar: works · order · call. Hidden on the order page and while typing. */
export function ActionBar({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const path = usePathname();
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const on = (e: FocusEvent) => setTyping(!!(e.target as HTMLElement)?.matches?.('input, textarea, select'));
    const off = () => setTyping(false);
    document.addEventListener('focusin', on);
    document.addEventListener('focusout', off);
    return () => {
      document.removeEventListener('focusin', on);
      document.removeEventListener('focusout', off);
    };
  }, []);
  const onOrder = path.startsWith(`/${lang}/order`);
  return (
    <nav className="actionbar" data-hidden={typing || onOrder} aria-label={lang === 'th' ? 'ทางลัด' : 'Shortcuts'} inert={onOrder}>
      <Link href={`/${lang}/works`}>{t.nav.works}</Link>
      <Link href={`/${lang}/order`} className="is-primary">
        {t.nav.order}
      </Link>
      <a href={`tel:${shop.phones.value[0].tel}`}>
        <Phone /> {t.footer.call}
      </a>
    </nav>
  );
}
