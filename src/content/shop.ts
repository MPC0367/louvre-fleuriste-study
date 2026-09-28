/**
 * The truth ledger. Every fact the site states about Louvre Fleuriste lives here with its source.
 *
 *   social     — read from the shop's own Instagram profile or posts (accessed 2026-09-27)
 *   listing    — from a third-party listing (Google Maps). Shown only with a visible "to confirm" note.
 *   demo       — an operating rule invented so the booking engine can be reviewed. Renders in
 *                preview behind a visible mark; must be replaced by the shop before anything ships.
 *   unverified — known to be needed, not yet confirmed. Never rendered.
 *
 * See context/method/truth-ledger.md and context/patterns/demo-provenance.md.
 */

export type Provenance = 'social' | 'listing' | 'demo' | 'unverified';

export interface Fact<T> {
  value: T;
  provenance: Provenance;
  source?: string;
}

const IG = 'https://www.instagram.com/louvrefleuriste/';

export const shop = {
  name: { value: 'Louvre Fleuriste', provenance: 'social', source: IG },
  nameTh: { value: 'ลูฟวร์ เฟลอริสเตอ', provenance: 'social', source: `${IG} (bio: “ร้านดอกไม้ลูฟวร์ เฟลอ ริส(เตอ)”)` },
  area: { value: { th: 'สุขุมวิท 77', en: 'Sukhumvit 77' }, provenance: 'social', source: `${IG} (bio)` },
  city: { value: { th: 'กรุงเทพฯ', en: 'Bangkok' }, provenance: 'social', source: 'post hashtags #bangkok #floristbangkok' },
  phones: {
    value: [
      { display: '081 965 1564', tel: '+66819651564' },
      { display: '083 855 5500', tel: '+66838555500' },
    ],
    provenance: 'social',
    source: 'bio (081…) and post captions 2026-05-05, 2026-06-15, 2026-07-23, 2026-08-24 (083…)',
  },
  bouquetFrom: { value: 2500, provenance: 'social', source: `${IG} (bio: “Bouquet from ฿2,500”)` },
  boxFrom: { value: 2000, provenance: 'social', source: `${IG} (bio: “Box from ฿2,000”)` },
  instagram: { value: IG, provenance: 'social' },
  facebook: { value: 'https://www.facebook.com/louvrefleuriste/', provenance: 'social', source: 'supplied in the brief' },
  /** Highlight titles on the profile: evidence of the occasions and lines the shop actually runs. */
  highlights: {
    value: ['Valentine 2026', 'Mother’s Day 2025', 'X’Mas', 'Classic Box', '“Cube” series', 'Valentine 2023'],
    provenance: 'social',
  },

  // ── Not confirmed. Structured so they drop in; never rendered while unverified. ──
  address: { value: null, provenance: 'unverified' },
  openingHours: { value: null, provenance: 'unverified' },
  lineOA: { value: { id: '@louvrefleuriste', url: 'https://line.me/R/ti/p/%40louvrefleuriste' }, provenance: 'social', source: 'Instagram bio link goo.gl/jchaqd → line.me/R/ti/p/@louvrefleuriste (2026-09-27)' },
  googleListing: {
    value: {
      name: 'Louvre Fleuriste Studio',
      address: { th: '102/1 ถนนนราธิวาสราชนครินทร์ แขวงทุ่งวัดดอน เขตสาทร กรุงเทพฯ 10120', en: '102/1 Naradhiwas Rajanagarindra Rd, Thung Wat Don, Sathon, Bangkok 10120' },
      lat: 13.711737,
      lng: 100.5349339,
      query: 'Louvre Fleuriste Studio, 102/1 Naradhiwas Rajanagarindra Rd, Bangkok',
      url: 'https://maps.google.com/?cid=2813886805826844505',
    },
    provenance: 'listing',
    source: 'Google Maps listing, same phone as the shop (083 855 5500); the Instagram bio says Sukhumvit 77 — confirm which is current',
  },
  deliveryArea: { value: null, provenance: 'unverified' },
  paymentMethods: { value: null, provenance: 'unverified' },
  substitutionPolicy: { value: null, provenance: 'unverified' },
} as const;

/** Only social-provenance facts may be rendered as fact. */
export function isShowable(f: { provenance: Provenance }) {
  return f.provenance === 'social';
}
