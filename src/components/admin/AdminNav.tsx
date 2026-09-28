'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import type { Lang } from '@/content/i18n';
import { adminDict } from '@/content/admin-i18n';
import { trimSlash } from '@/lib/paths';

function Nav({ lang }: { lang: Lang }) {
  const a = adminDict[lang];
  const path = trimSlash(usePathname());
  const q = useSearchParams();
  const base = `/${lang}/admin`;
  const items = [
    { href: base, label: a.nav.orders, on: path === base },
    { href: `${base}/capacity`, label: a.nav.capacity, on: path === `${base}/capacity` },
    { href: `${base}/settings`, label: a.nav.settings, on: path === `${base}/settings` },
  ];
  const other = lang === 'th' ? 'en' : 'th';
  const switchHref = path.replace(/^\/(th|en)/, `/${other}`) + (q.size ? `?${q}` : '');
  return (
    <nav className="adm__nav" aria-label={a.title}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.on ? 'page' : undefined}>
          {i.label}
        </Link>
      ))}
      <span className="adm__navsep" />
      <Link href={switchHref} hrefLang={other} lang={other} className="adm__lang">
        {other === 'en' ? 'English' : 'ภาษาไทย'}
      </Link>
      <Link href={`/${lang}`} className="adm__lang">
        {a.nav.site} ↗
      </Link>
    </nav>
  );
}

export function AdminNav({ lang }: { lang: Lang }) {
  return (
    <Suspense>
      <Nav lang={lang} />
    </Suspense>
  );
}
