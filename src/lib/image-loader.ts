import { imgUrl } from './paths';

/** next/image loader for the static build (next.config.mjs, LF_STATIC=1): pre-built WebP sizes. */
export default function loader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith('data:') || src.startsWith('blob:') || /^https?:/.test(src)) return src;
  return imgUrl(src, width, quality);
}
