/**
 * Louvre Fleuriste logo, redrawn as vector from the supplied lockup (documents/brand/louvre-logo-supplied.webp):
 * a lattice of 45° lines that crosses into an X above a pyramid of diamonds, over LOUVRE / fleuriste.
 * Geometry is in the source image's pixel space (1254 px square) so it can be checked against it.
 */
const STEP = 56;
const APEX_A = -247; // y − x through the apex
const APEX_B = 1009; // y + x through the apex
const BASE = 549; // where the last A and B lines cross, so the base closes into whole diamonds

function lattice() {
  const segs: [number, number, number, number][] = [];
  for (let i = 0; i < 7; i++) {
    const k = APEX_A + i * STEP; // y = x + k
    const x0 = i < 3 ? 522 : (APEX_B - k) / 2;
    const x1 = BASE - k;
    if (x1 - x0 > 8) segs.push([x0, x0 + k, x1, BASE]);
  }
  for (let i = 0; i < 7; i++) {
    const k = APEX_B + i * STEP; // y = k − x
    const x1 = i < 3 ? 736 : (k - APEX_A) / 2;
    const x0 = k - BASE;
    if (x1 - x0 > 8) segs.push([x0, BASE, x1, k - x1]);
  }
  return segs.map(([a, b, c, d]) => `M${a} ${b}L${c} ${d}`).join('');
}
export const LATTICE_PATH = lattice();
export const LATTICE_VIEWBOX = '452 266 356 294';

export function LogoMark({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox={LATTICE_VIEWBOX} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} focusable="false">
      {title && <title>{title}</title>}
      <path d={LATTICE_PATH} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="square" />
    </svg>
  );
}

/** Stacked lockup: mark, LOUVRE, fleuriste. Colour follows currentColor. */
export function Logo({ className = '', mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={`logo ${className}`} lang="en">
      {mark && <LogoMark className="logo__mark" />}
      <span className="logo__word">LOUVRE</span>
      <span className="logo__sub">fleuriste</span>
    </span>
  );
}
