'use client';
import { useEffect, useRef, useState } from 'react';

type Idle = (cb: () => void, o?: { timeout: number }) => number;

/**
 * The Google map, loaded late: only once it is near the screen, scrolling has settled and the
 * browser is idle. A map iframe is heavy, and loading it mid-scroll makes the page stutter. It fades
 * in over the placeholder once it has drawn.
 */
export function GMap({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [go, setGo] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    let t = 0;
    let idle = 0;
    const ric: Idle = (window as unknown as { requestIdleCallback?: Idle }).requestIdleCallback ?? ((cb) => window.setTimeout(cb, 200));
    const load = () => {
      window.removeEventListener('scroll', settle);
      idle = ric(() => setGo(true), { timeout: 1500 });
    };
    const settle = () => {
      clearTimeout(t);
      t = window.setTimeout(load, 220);
    };
    if (!('IntersectionObserver' in window)) {
      setGo(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        window.addEventListener('scroll', settle, { passive: true });
        settle();
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(f);
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', settle);
      clearTimeout(t);
      clearTimeout(idle);
      (window as unknown as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(idle);
    };
  }, []);

  return (
    <iframe
      ref={ref}
      className="mapblock__gmap"
      data-lf-gmap
      data-loaded={loaded || undefined}
      title={title}
      src={go ? src : undefined}
      onLoad={() => go && setLoaded(true)}
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
