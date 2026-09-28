'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { dict, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { LangLink, LangSwitch } from './LangSwitch';
import { Phone } from './Icons';
import { Logo } from './Logo';
import { trimSlash } from '@/lib/paths';

export function Header({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const path = trimSlash(usePathname());
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setOpen(false), [path]);
  // While the menu is open, the page behind it is out of reach: no scroll, no focus, no screen reader.
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      btn.current?.focus();
    };
    document.addEventListener('keydown', k);
    // Rotating or widening past the mobile breakpoint hides the menu button, so close the sheet and release the page.
    const narrow = window.matchMedia('(max-width: 899px)');
    const shut = () => {
      if (!narrow.matches) setOpen(false);
    };
    narrow.addEventListener('change', shut);
    document.body.style.overflow = 'hidden';
    const behind = Array.from(document.querySelectorAll<HTMLElement>('#main, footer.footer, .actionbar'));
    const was = behind.map((el) => el.inert);
    behind.forEach((el) => (el.inert = true));
    return () => {
      document.removeEventListener('keydown', k);
      narrow.removeEventListener('change', shut);
      document.body.style.overflow = '';
      behind.forEach((el, i) => (el.inert = was[i]));
    };
  }, [open]);
  const close = () => setOpen(false);
  // The sheet hangs from the header's actual bottom edge (the concept bar above it scrolls away),
  // measured before opening so the first frame is already right.
  const toggle = () => {
    const top = header.current?.getBoundingClientRect().bottom;
    if (!open && top) document.documentElement.style.setProperty('--sheet-top', `${Math.max(0, Math.round(top))}px`);
    setOpen((o) => !o);
  };

  const items = [
    { href: `/${lang}/works`, label: t.nav.works },
    { href: `/${lang}/instagram`, label: t.nav.instagram },
    { href: `/${lang}/contact`, label: t.nav.visit },
  ];
  const current = (href: string) => (path === href || path.startsWith(href + '/') ? 'page' : undefined);

  return (
    <>
      <header ref={header} className="header" data-scrolled={scrolled || open}>
        <div className="wrap header__in">
          <Link href={`/${lang}`} className="header__logo" onClick={() => setOpen(false)} aria-label={`Louvre Fleuriste — ${t.nav.home}`}>
            <Logo className="logo--header" />
          </Link>
          <nav className="nav" aria-label={lang === 'th' ? 'เมนูหลัก' : 'Main'}>
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="nav__link" aria-current={current(i.href)}>
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="header__end">
            <Suspense fallback={<LangLink lang={lang} />}>
              <LangSwitch lang={lang} />
            </Suspense>
            <Link href={`/${lang}/order`} className="btn" aria-current={current(`/${lang}/order`)}>
              <span className="btn__diamond" aria-hidden="true" />
              {t.nav.order}
            </Link>
            <button ref={btn} className="menu-btn" aria-expanded={open} aria-controls="sheet" onClick={toggle}>
              <span className="sr-only">{open ? t.nav.close : t.nav.menu}</span>
              <span className="menu-btn__bars" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <div id="sheet" className="sheet" data-open={open} aria-hidden={!open} inert={!open}>
        {[{ href: `/${lang}/order`, label: t.nav.order }, ...items].map((i, n) => (
          <Link key={i.href} href={i.href} className="sheet__link" aria-current={current(i.href)} onClick={close}>
            {i.label}
            <span className="num">0{n + 1}</span>
          </Link>
        ))}
        <div className="sheet__foot">
          {shop.phones.value.map((p) => (
            <a key={p.tel} href={`tel:${p.tel}`} className="link" onClick={close}>
              <Phone /> {p.display}
            </a>
          ))}
          <a href={shop.instagram.value} target="_blank" rel="noopener noreferrer" className="link" onClick={close}>
            Instagram @louvrefleuriste
          </a>
          <a href={shop.facebook.value} target="_blank" rel="noopener noreferrer" className="link" onClick={close}>
            Facebook
          </a>
        </div>
      </div>
    </>
  );
}
