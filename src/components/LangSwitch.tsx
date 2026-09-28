'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { dict, type Lang } from '@/content/i18n';

/**
 * Switches language on the same page, keeping the query string (and so the filter, the chosen
 * work). The order in progress lives in localStorage, so switching never clears it. The page
 * loader covers the change, so no second transition is layered on top.
 */
export function LangSwitch({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const other: Lang = lang === 'th' ? 'en' : 'th';
  const path = usePathname();
  const q = useSearchParams();
  const router = useRouter();
  const href = path.replace(/^\/(th|en)(?=\/|$)/, `/${other}`) + (q.size ? `?${q.toString()}` : '');

  function go(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented) return; // PageLoader has taken the click and navigates once the veil is up
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    router.push(href, { scroll: false });
  }

  return (
    <a href={href} onClick={go} className="langswitch" hrefLang={other} lang={other} aria-label={`TH EN — ${t.lang.switchTo}`}>
      <span aria-current={lang === 'th'}>TH</span>
      <span className="langswitch__sep" aria-hidden="true" />
      <span aria-current={lang === 'en'}>EN</span>
    </a>
  );
}
