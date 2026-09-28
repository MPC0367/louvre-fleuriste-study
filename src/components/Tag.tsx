import { LATTICE_PATH, LATTICE_VIEWBOX } from './Logo';

/** The shop's navy diamond tag. Hangs from a string. */
export function Tag({ className = '', swing = false, label = true }: { className?: string; swing?: boolean; label?: boolean }) {
  return (
    <span className={`tag ${swing ? 'tag--swing' : ''} ${className}`} aria-hidden="true">
      <span className="tag__string" />
      <span className="tag__card" />
      {label && (
        <span className="tag__text" lang="en">
          <svg className="tag__mark" viewBox={LATTICE_VIEWBOX} aria-hidden="true">
            <path d={LATTICE_PATH} />
          </svg>
          <b>LOUVRE</b>
          <i>fleuriste</i>
        </span>
      )}
    </span>
  );
}
