'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LATTICE_PATH, LATTICE_VIEWBOX } from './Logo';

const MIN_MS = 650;
const VEIL_MS = 170; // .loader[data-on='true'] fades in over 160ms; the page swaps only once it is opaque

type LfWindow = Window & { __lfLoaded?: boolean; __lfShownAt?: number };

/** Tells the page the loader has lifted: Reveal and the hero carousel wait for this. */
function lifted() {
  (window as LfWindow).__lfLoaded = true;
  window.dispatchEvent(new Event('lf:loaded'));
}

/**
 * The Louvre Fleuriste loader: navy ground, the lattice mark drawing itself, the wordmark settling.
 * Shown on first load and whenever the page (path) changes; filters, steps and the lightbox, which
 * only change the query string, do not trigger it. A link click is held until the veil is opaque, so
 * the old page never swaps visibly underneath it. Kept short, and a CSS failsafe removes it even if
 * scripts never run.
 */
export function PageLoader() {
  const path = usePathname();
  const router = useRouter();
  // On the server and on first load (__lfLoaded unset) the loader shows. On a remount (a language
  // switch remounts the [lang] layout) only while a click is in progress, so Back across languages
  // does not flash navy.
  const [on, setOn] = useState(() => typeof window === 'undefined' || (window as LfWindow).__lfLoaded !== true);
  const [shows, setShows] = useState(0);
  const lastPath = useRef(path);
  const box = useRef<HTMLDivElement>(null);

  // A client-side language switch re-renders <html> and can drop the class the inline script set.
  useLayoutEffect(() => {
    document.documentElement.classList.add('js');
  });

  // Remounted mid-change by a language switch: pick the lattice and wordmark up where the click left them.
  useLayoutEffect(() => {
    const w = window as LfWindow;
    if (w.__lfLoaded !== false || w.__lfShownAt == null) return;
    const since = performance.now() - w.__lfShownAt;
    box.current?.getAnimations?.({ subtree: true }).forEach((a) => {
      a.currentTime = since;
    });
  }, []);

  // Hide once the first page has loaded. The clock starts at navigation (or at the click, when a
  // language switch remounted this component), not at hydration.
  useEffect(() => {
    let t = 0;
    const done = () => {
      const w = window as LfWindow;
      const wait =
        w.__lfLoaded === false && w.__lfShownAt != null
          ? Math.max(0, MIN_MS - (performance.now() - w.__lfShownAt))
          : Math.max(0, MIN_MS + 250 - performance.now());
      t = window.setTimeout(() => {
        setOn(false);
        lifted();
      }, wait);
    };
    if (document.readyState === 'complete') done();
    else window.addEventListener('load', done, { once: true });
    return () => {
      window.removeEventListener('load', done);
      clearTimeout(t);
    };
  }, []);

  // Show on internal link clicks that change the path, and hold the navigation until the veil is opaque.
  useEffect(() => {
    let pending = 0;
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
      if (url.pathname === location.pathname) return;
      e.preventDefault(); // next/link and LangSwitch skip their own push when the click is already handled
      (window as LfWindow).__lfShownAt = performance.now();
      (window as LfWindow).__lfLoaded = false;
      setShows((n) => n + 1);
      setOn(true);
      const from = location.href;
      const keep = !!a.closest('.langswitch'); // the language switch keeps the scroll position
      clearTimeout(pending);
      pending = window.setTimeout(() => {
        if (location.href === from) router.push(url.pathname + url.search + url.hash, { scroll: !keep });
      }, VEIL_MS);
    };
    document.addEventListener('click', click, true);
    return () => {
      document.removeEventListener('click', click, true);
      clearTimeout(pending);
    };
  }, [router]);

  // Hide after the new page has rendered. Compare paths, not runs: React's dev double-run of effects
  // on a remount must not lift the loader at once.
  useEffect(() => {
    if (lastPath.current === path) return;
    lastPath.current = path;
    const wait = Math.max(0, MIN_MS - (performance.now() - ((window as LfWindow).__lfShownAt ?? 0)));
    const t = setTimeout(() => {
      setOn(false);
      lifted();
    }, wait);
    return () => clearTimeout(t);
  }, [path]);

  // Failsafe: a click that never navigates must not leave the page covered.
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => {
      setOn(false);
      lifted();
    }, 4000);
    return () => clearTimeout(t);
  }, [on]);

  return (
    <div ref={box} className="loader" data-on={on} data-by={shows ? 'click' : 'load'} aria-hidden="true">
      <div className="loader__in" key={shows}>
        <svg className="loader__mark" viewBox={LATTICE_VIEWBOX}>
          <path d={LATTICE_PATH} pathLength={1} />
        </svg>
        <span className="loader__word">LOUVRE</span>
        <span className="loader__sub">fleuriste</span>
      </div>
    </div>
  );
}
