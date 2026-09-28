'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { dict, longDate, type Lang } from '@/content/i18n';
import { photo, postUrl, type Work } from '@/content/works';
import { imgUrl } from '@/lib/paths';
import { Arrow, Close } from './Icons';
import { keepWords } from '@/lib/thai';

const img = (id: string, w: number) => imgUrl(photo(id), w, 85);

/**
 * The shop's feed, re-authored: a snapshot of real posts (no embeds, no scraping at runtime).
 * ?post=<shortcode> opens the lightbox, so a post is linkable and the back button closes it.
 */
/**
 * The grid alone, with no useSearchParams: the Instagram page also renders it as Feed's Suspense
 * fallback, so the static site carries the photos in its HTML.
 */
export function FeedGrid({ works, lang, onOpen, onFail }: { works: Work[]; lang: Lang; onOpen?: (id: string) => void; onFail?: (id: string) => void }) {
  const t = dict[lang];
  return (
    <div className="feed">
      {works.map((w, i) => (
        <button
          key={w.id}
          type="button"
          className="post reveal"
          data-post={w.id}
          style={{ ['--i' as string]: i % 3 }}
          onClick={() => onOpen?.(w.id)}
          aria-haspopup="dialog"
          aria-label={`${t.ig.open}: ${w.name[lang]}, ${longDate(w.date, lang)}`}
        >
          <Image
            src={photo(w.id)}
            alt=""
            fill
            sizes="(max-width: 639px) 57vw, (max-width: 1439px) 38vw, 540px"
            quality={82}
            onError={() => onFail?.(w.id)}
            style={{ objectFit: 'cover' }}
          />
          <span className="post__veil" aria-hidden="true">
            <b>{w.name[lang]}</b>
            <span>{longDate(w.date, lang)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function Feed({ works, lang }: { works: Work[]; lang: Lang }) {
  const t = dict[lang];
  const q = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const openId = q.get('post');
  const idx = openId ? works.findIndex((w) => w.id === openId) : -1;
  const dlg = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  // Set when opening a post pushed a history entry: closing then steps back over it, so the first
  // Back after closing leaves the page instead of doing nothing.
  const pushed = useRef(false);

  const setPost = useCallback(
    (id: string | null, replace = false) => {
      const p = new URLSearchParams(q.toString());
      if (id) p.set('post', id);
      else p.delete('post');
      const url = p.size ? `${path}?${p}` : path;
      if (replace) router.replace(url, { scroll: false });
      else {
        if (id) pushed.current = true;
        router.push(url, { scroll: false });
      }
    },
    [q, path, router],
  );

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (idx >= 0 && !d.open) {
      lastFocus.current = document.activeElement as HTMLElement;
      d.showModal();
      d.querySelector<HTMLElement>('.lightbox__close')?.focus();
    } else if (idx < 0 && d.open) {
      d.close();
    }
  }, [idx]);

  const onClose = () => {
    const id = openId;
    if (id) {
      if (pushed.current) {
        pushed.current = false;
        router.back();
      } else setPost(null, true);
    } else pushed.current = false;
    // A deep-linked post has no useful last focus: return to its tile in the grid.
    const l = lastFocus.current;
    const back = l && l !== document.body && l.isConnected ? l : document.querySelector<HTMLElement>(`.post[data-post="${id ?? ''}"]`);
    back?.focus();
  };

  const step = useCallback(
    (dir: 1 | -1) => {
      if (idx < 0) return;
      const n = (idx + dir + works.length) % works.length;
      setPost(works[n].id, true);
    },
    [idx, works, setPost],
  );

  useEffect(() => {
    if (idx < 0) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [idx, step]);

  // Swipe on the stage.
  const startX = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') startX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
  };

  const cur = idx >= 0 ? works[idx] : null;
  const visible = works.filter((w) => !failed[w.id]);

  return (
    <>
      <FeedGrid works={visible} lang={lang} onOpen={(id) => setPost(id)} onFail={(id) => setFailed((f) => ({ ...f, [id]: true }))} />

      <dialog ref={dlg} className="lightbox on-ink" onClose={onClose} aria-labelledby="lb-name" lang={lang}>
        {cur && (
          <>
            <div className="lightbox__stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
              {failed[cur.id] ? (
                <p className="lightbox__cap">{t.ig.fallback}</p>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={cur.id}
                  className="lightbox__img"
                  src={img(cur.id, 1080)}
                  srcSet={[640, 1080, 1440].map((w) => `${img(cur.id, w)} ${w}w`).join(', ')}
                  sizes={`(max-width: 899px) min(640px, calc(100vw - 32px), calc(48vh * ${(cur.w / cur.h).toFixed(3)})), min(640px, calc(100vw - 32px))`}
                  width={cur.w}
                  height={cur.h}
                  alt={lang === 'th' ? `${cur.name.th}: ${cur.seen.th}` : `${cur.name.en}: ${cur.seen.en}`}
                  onError={() => setFailed((f) => ({ ...f, [cur.id]: true }))}
                  draggable={false}
                />
              )}
              <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => step(-1)} aria-label={t.ig.prev}>
                <Arrow />
              </button>
              <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => step(1)} aria-label={t.ig.next}>
                <Arrow />
              </button>
            </div>
            <aside className="lightbox__side">
              <div className="lightbox__top">
                <span className="lightbox__counter" aria-live="polite">
                  {idx + 1} {t.ig.of} {works.length}
                </span>
                <button type="button" className="lightbox__close" onClick={() => dlg.current?.close()} aria-label={t.ig.close} autoFocus>
                  <Close />
                </button>
              </div>
              <div className="lightbox__progress" aria-hidden="true">
                <i style={{ transform: `scaleX(${(idx + 1) / works.length})` }} />
              </div>
              <div>
                <p className="label">
                  <time dateTime={cur.date}>{longDate(cur.date, lang)}</time>
                </p>
                <h2 id="lb-name" className="lightbox__name" style={{ marginTop: 10 }}>
                  {cur.name[lang]}
                </h2>
              </div>
              <p className="lightbox__cap">“{cur.caption}”</p>
              <p className="lightbox__cap small">
                {t.works.seen}: {keepWords(cur.seen[lang])}
              </p>
              <div className="lightbox__actions">
                <Link href={`/${lang}/order?work=${cur.id}`} className="btn btn--light">
                  <span className="btn__diamond" aria-hidden="true" />
                  {t.works.orderStyle}
                </Link>
                <Link href={`/${lang}/order?work=${cur.id}&similar=1`} className="btn btn--ghost-light">
                  {t.works.similar}
                </Link>
                <a href={postUrl(cur.id)} target="_blank" rel="noopener noreferrer" className="link">
                  {t.works.viewOriginal} <Arrow />
                </a>
              </div>
            </aside>
          </>
        )}
      </dialog>
    </>
  );
}
