'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Keyboard behaviour for the order drawer: focus moves into it, Escape closes it, the list behind is
 * out of reach while it is open, and closing returns focus to the order's row. Closing (X, scrim or
 * Escape) steps back over the row's history entry, so Back never reopens a closed order. Unsaved
 * internal notes are never thrown away silently.
 */
export function DrawerFocus({ closeHref, orderRef, discard }: { closeHref: string; orderRef: string; discard: string }) {
  const router = useRouter();
  useEffect(() => {
    document.querySelector<HTMLElement>('.adm-drawer .adm-close')?.focus({ preventScroll: true });
    const lists = Array.from(document.querySelectorAll<HTMLElement>('.adm__side, .adm__main > :not(.adm-drawer):not(.adm-scrim)'));
    const was = lists.map((el) => el.inert);
    lists.forEach((el) => (el.inert = true));
    // Opened from a row in this tab (not a pasted link or a reload): the entry behind is the list.
    const nav = performance.getEntriesByType('navigation')[0];
    const fromList = !!nav && nav.name !== location.href && history.length > 1;
    const dirty = () => !!document.querySelector('.adm-drawer [data-dirty="true"]');
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      if (fromList) router.back();
      else router.replace(closeHref, { scroll: false });
    };
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing) return;
      if (dirty()) {
        // Keep unsaved notes: stay open and put focus on Save, so Enter saves.
        e.preventDefault();
        document.querySelector<HTMLElement>('.adm-drawer [data-save]')?.focus();
        return;
      }
      close();
    };
    // X and scrim stay <Link>s (the no-JS fallback); preventDefault makes next/link skip its own push.
    const c = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!(e.target as Element | null)?.closest?.('.adm-drawer .adm-close, .adm-scrim')) return;
      e.preventDefault();
      if (dirty() && !window.confirm(discard)) return;
      close();
    };
    document.addEventListener('keydown', k);
    document.addEventListener('click', c, true);
    return () => {
      document.removeEventListener('keydown', k);
      document.removeEventListener('click', c, true);
      lists.forEach((el, i) => (el.inert = was[i]));
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`a.adm-order[href*="order=${encodeURIComponent(orderRef)}"]`)?.focus({ preventScroll: true }),
      );
    };
  }, [closeHref, orderRef, router, discard]);
  return null;
}
