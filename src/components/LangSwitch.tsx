'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { dict, type Lang } from '@/content/i18n';
import { withBase } from '@/lib/paths';

/**
 * The TH | EN link for this page. Built from the path alone, so it renders into the static HTML (the
 * header uses it until the query string is known). The href carries the base path, so opening it in a
 * new tab works on GitHub Pages too.
 */
export function LangLink({ lang, query = '', onClick }: { lang: Lang; query?: string; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void }) {
  const t = dict[lang];
  const other: Lang = lang === 'th' ? 'en' : 'th';
  const href = usePathname().replace(/^\/(th|en)(?=\/|$)/, `/${other}`) + query;
  return (
    <a href={withBase(href)} onClick={onClick} className="langswitch" hrefLang={other} lang={other} aria-label={`TH EN — ${t.lang.switchTo}`}>
      <span aria-current={lang === 'th'}>TH</span>
      <span className="langswitch__sep" aria-hidden="true" />
      <span aria-current={lang === 'en'}>EN</span>
    </a>
  );
}

/**
 * Switches language on the same page, keeping the query string (and so the filter, the chosen
 * work). The order in progress lives in localStorage, so switching never clears it. The page
 * loader covers the change, so no second transition is layered on top.
 */
export function LangSwitch({ lang }: { lang: Lang }) {
  const other: Lang = lang === 'th' ? 'en' : 'th';
  const path = usePathname();
  const q = useSearchParams();
  const router = useRouter();
  const query = q.size ? `?${q.toString()}` : '';

  function go(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented) return; // PageLoader has taken the click and navigates once the veil is up
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    router.push(path.replace(/^\/(th|en)(?=\/|$)/, `/${other}`) + query, { scroll: false }); // the router adds the base path itself
  }

  return <LangLink lang={lang} query={query} onClick={go} />;
}
