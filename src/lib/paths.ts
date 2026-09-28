/**
 * Where the site is served from, and how photographs are sized. Locally the site sits at the root and
 * Next.js resizes photos on request. The static demo on GitHub Pages lives under a sub-path and serves
 * WebP files resized ahead of time by scripts/build-pages.mjs.
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const STATIC = process.env.NEXT_PUBLIC_LF_STATIC === '1';

/** A path as the app knows it (/th/works/), from a URL pathname that may carry the base path. */
export const stripBase = (p: string) => (BASE && (p === BASE || p.startsWith(BASE + '/')) ? p.slice(BASE.length) || '/' : p);

/** A pathname without its trailing slash (the static build uses trailing slashes). */
export const trimSlash = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);

/** A root-relative path (/th/works) as the browser must request it on this host. */
export const withBase = (p: string) => (p.startsWith('/') && !p.startsWith('//') ? BASE + p : p);

/** Widths the static build pre-renders; Next.js asks for these (next.config deviceSizes + imageSizes). */
export const IMAGE_WIDTHS = [96, 160, 240, 320, 360, 480, 640, 828, 1080, 1440, 1920];

/** A photograph at a given width: the image optimiser locally, a pre-built WebP in the static site. */
export function imgUrl(src: string, width: number, quality = 82) {
  if (!STATIC) return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
  const w = IMAGE_WIDTHS.find((x) => x >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  const name = src.replace(/^.*\//, '').replace(/\.[a-z0-9]+$/i, '');
  return `${BASE}/img/${name}-${w}.webp`;
}
