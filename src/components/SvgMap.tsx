import map from '@/content/map/sathon.json';
import type { Lang } from '@/content/i18n';
import { LATTICE_PATH, LATTICE_VIEWBOX } from './Logo';

type MapData = { w: number; h: number; pin: [number, number]; paths: Record<string, string>; labels: { x: number; y: number; a: number; th: string; en: string; kind: string }[]; attribution: string };
const M = map as unknown as MapData;

/**
 * The studio's streets, drawn from OpenStreetMap in the site's palette. Drag to move, pinch or
 * ctrl/⌘ + scroll to zoom (wired by lib/enhance.js). Used where an embedded Google map can't load.
 */
export function SvgMap({ lang, hidden = false, label }: { lang: Lang; hidden?: boolean; label: string }) {
  const [px, py] = M.pin;
  const vw = 900;
  const vh = 640;
  const view = `${px - vw / 2} ${py - vh / 2} ${vw} ${vh}`;
  return (
    <div className="svgmap" data-svgmap data-w={M.w} data-h={M.h} data-view={view} hidden={hidden}>
      <svg viewBox={view} role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
        <rect x="0" y="0" width={M.w} height={M.h} className="svgmap__ground" />
        <path d={M.paths.park} className="svgmap__park" />
        <path d={M.paths.water} className="svgmap__water" />
        <path d={M.paths.service} className="svgmap__service" />
        <path d={M.paths.minor} className="svgmap__minor" />
        <path d={M.paths.major} className="svgmap__major-case" />
        <path d={M.paths.major} className="svgmap__major" />
        <path d={M.paths.motorway} className="svgmap__motorway" />
        {M.labels.map((l, i) => (
          <text key={i} x={l.x} y={l.y} transform={`rotate(${l.a} ${l.x} ${l.y})`} className={`svgmap__label svgmap__label--${l.kind}`} lang={lang}>
            {lang === 'th' ? l.th : l.en}
          </text>
        ))}
        <g className="svgmap__pin" transform={`translate(${px} ${py})`}>
          <circle r="46" className="svgmap__halo" />
          <rect x="-15" y="-15" width="30" height="30" transform="rotate(45)" className="svgmap__diamond" />
          <svg x="-9" y="-8" width="18" height="15" viewBox={LATTICE_VIEWBOX}>
            <path d={LATTICE_PATH} fill="none" stroke="#f4f1ec" strokeWidth="26" />
          </svg>
        </g>
      </svg>
      <div className="svgmap__ctl">
        <button type="button" data-zoom="in" aria-label={lang === 'th' ? 'ขยาย' : 'Zoom in'}>+</button>
        <button type="button" data-zoom="out" aria-label={lang === 'th' ? 'ย่อ' : 'Zoom out'}>−</button>
        <button type="button" data-zoom="reset" aria-label={lang === 'th' ? 'กลับไปที่ร้าน' : 'Back to the studio'}>◇</button>
      </div>
      <p className="svgmap__hint" aria-hidden="true">{lang === 'th' ? 'กด ctrl หรือ ⌘ ค้างไว้แล้วเลื่อนเพื่อซูม ลากเพื่อเลื่อนแผนที่' : 'Hold ctrl or ⌘ and scroll to zoom · drag to move'}</p>
      <p className="svgmap__attr">{M.attribution}</p>
    </div>
  );
}
