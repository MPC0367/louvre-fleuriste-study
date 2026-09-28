'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const SEL = '.reveal:not(.is-in), .lift:not(.is-in)';

/** Path of the last Back/Forward (history traversal). Read and cleared by the next effect run. */
let popPath: string | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => (popPath = location.pathname), { capture: true });
}

/**
 * Adds .is-in to .reveal / .lift elements as they enter the viewport. One observer per page, and a
 * MutationObserver hands it anything React adds later (a filtered gallery, a new step), so nothing
 * is left hidden. The first pass waits for the loader to lift, so the entrance is seen, not missed.
 */
export function Reveal() {
  const path = usePathname();
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      const all = () => document.querySelectorAll<HTMLElement>(SEL).forEach((e) => e.classList.add('is-in'));
      all();
      const mo = new MutationObserver(all);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const watch = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(SEL)) io.observe(root);
      root.querySelectorAll<HTMLElement>(SEL).forEach((e) => io.observe(e));
    };
    const mo = new MutationObserver((recs) => {
      for (const r of recs) r.addedNodes.forEach((n) => n instanceof HTMLElement && watch(n));
    });
    const start = () => {
      watch(document);
      mo.observe(document.body, { childList: true, subtree: true });
    };
    const w = window as Window & { __lfLoaded?: boolean };
    const traversed = popPath === location.pathname;
    popPath = null;
    let raf = 0;
    if (w.__lfLoaded) {
      if (traversed) {
        // Back/Forward: no loader covers the change, so what was on screen returns at once.
        // Measured a frame later: scroll restoration lands after this effect.
        const de = document.documentElement;
        de.classList.add('lf-instant');
        raf = requestAnimationFrame(() => {
          document.querySelectorAll<HTMLElement>(SEL).forEach((e) => {
            const r = e.getBoundingClientRect();
            if (r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) e.classList.add('is-in');
          });
          raf = requestAnimationFrame(() => {
            raf = requestAnimationFrame(() => de.classList.remove('lf-instant'));
          });
        });
      }
      start();
    } else window.addEventListener('lf:loaded', start, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('lf-instant');
      window.removeEventListener('lf:loaded', start);
      mo.disconnect();
      io.disconnect();
    };
  }, [path]);
  return null;
}
