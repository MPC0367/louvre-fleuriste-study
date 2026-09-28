import type { Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { SvgMap } from './SvgMap';
import { GMap } from './GMap';
import { LogoMark } from './Logo';
import { Arrow } from './Icons';

/**
 * The studio on a map. The live site embeds Google Maps; the single-file snapshot (which can't embed
 * other sites) swaps the iframe for the drawn map rendered next to it.
 */
export function MapBlock({ lang }: { lang: Lang }) {
  const g = shop.googleListing.value;
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(g.query)}&ll=${g.lat},${g.lng}&z=16&hl=${lang}&output=embed`;
  const label = lang === 'th' ? 'แผนที่ร้าน Louvre Fleuriste Studio' : 'Map of Louvre Fleuriste Studio';
  return (
    <div className="mapblock">
      <div className="mapblock__frame">
        <LogoMark className="mapblock__mark" />
        <GMap src={embed} title={label} />
      </div>
      <SvgMap lang={lang} hidden label={label} />
      <a className="mapblock__open link" href={g.url} target="_blank" rel="noopener noreferrer">
        {lang === 'th' ? 'เปิดใน Google Maps' : 'Open in Google Maps'} <Arrow />
      </a>
    </div>
  );
}
