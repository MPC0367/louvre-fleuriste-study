import Image from 'next/image';
import life from '@/content/lifestyle.json';
import type { Lang } from '@/content/i18n';

type L = { id: string; w: number; h: number };
const photos = life as L[];

const copy = {
  th: { kicker: 'ถึงมือคนรับ', title: 'ดอกไม้มีความหมาย เพราะมีคนตั้งใจให้', note: 'ภาพจากร้านและลูกค้าของ Louvre Fleuriste', alt: 'ลูกค้าถือช่อดอกไม้จาก Louvre Fleuriste' },
  en: { kicker: 'Handed over', title: 'Flowers mean something because someone gives them', note: 'Photographs from Louvre Fleuriste and its customers', alt: 'A customer holding a bouquet from Louvre Fleuriste' },
};

/** People with the shop's bouquets. Hidden until photos are saved into documents/lifestyle/. */
export function Lifestyle({ lang }: { lang: Lang }) {
  if (!photos.length) return null;
  const c = copy[lang];
  return (
    <section className="life" aria-labelledby="life-title">
      <div className="wrap">
        <div className="head">
          <p className="head__kicker label reveal">{c.kicker}</p>
          <h2 id="life-title" className="display h-l reveal" style={{ maxWidth: '16em' }}>
            {c.title}
          </h2>
        </div>
        <div className="life__grid" data-count={Math.min(photos.length, 5)}>
          {photos.slice(0, 5).map((p, i) => (
            <figure key={p.id} className="life__item lift" style={{ ['--i' as string]: i }}>
              <Image src={`/works/${p.id}.jpg`} alt={c.alt} width={p.w} height={p.h} sizes="(max-width: 767px) 92vw, (max-width: 1439px) 46vw, 660px" quality={82} />
            </figure>
          ))}
        </div>
        <p className="small life__note">{c.note}</p>
      </div>
    </section>
  );
}
