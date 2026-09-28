import Image from 'next/image';
import type { Lang } from '@/content/i18n';

/** The studio's shopfront. A Google Maps photo about nine years old, so the caption says so. */
export function ShopFront({ lang }: { lang: Lang }) {
  return (
    <figure className="visit__shop">
      <span className="visit__photo lift">
        <Image
          src="/works/shop-front.jpg"
          alt={lang === 'th' ? 'หน้าร้าน Louvre Fleuriste กันสาดสีกรมท่าพร้อมโลโก้ ผนังสีน้ำเงิน' : 'The Louvre Fleuriste shopfront: navy awning with the lattice logo, blue walls, glass door'}
          width={1668}
          height={1365}
          sizes="(max-width: 1023px) 92vw, 34vw"
        />
      </span>
      <figcaption className="small">
        {lang === 'th' ? 'หน้าร้าน Louvre Fleuriste Studio ภาพจาก Google Maps ราว 9 ปี\u2060ก่อน' : 'Louvre Fleuriste Studio’s shopfront. Photo from Google Maps, about nine years old.'}
      </figcaption>
    </figure>
  );
}
