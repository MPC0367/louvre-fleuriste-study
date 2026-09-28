/**
 * The register of works: twelve arrangements the shop posted on Instagram, 2026-04-04 → 2026-09-11.
 *
 * `name` and `caption` are the shop's own words from each post. `seen` is what the photograph
 * shows, written by O2 from looking at it — a description, not a product specification, and it is
 * labelled that way on the page. None of these is a stocked product: each is a one-off, so the
 * page offers "order in this style", never "add to cart".
 *
 * Photographs: shop-owned, rights status `shop-owned-unapproved`. Local preview only.
 */

export type ColourFamily = 'white' | 'blue' | 'yellow' | 'lavender' | 'pink' | 'peach' | 'red';
export type Occasion = 'valentines' | 'mothers-day' | 'christmas';

export interface Work {
  id: string; // Instagram shortcode
  no: number; // catalogue number in display order: the newest post is the highest, the last saved photo is 1
  date: string; // ISO, from the post
  name: { th: string; en: string };
  caption: string; // verbatim, first paragraph
  seen: { th: string; en: string };
  colours: ColourFamily[];
  note: string; // a hand-picked swatch from the photograph
  occasion?: Occasion;
  format: 'bouquet' | 'vase' | 'box';
  /** Instagram shortcode posts link back; photos saved by hand into documents/more-photos/ don't. */
  source?: 'instagram' | 'saved';
  /** A grid save still at its ~720px AI upscale (no enhanced original yet): kept in small slots. */
  lowres?: boolean;
  w: number;
  h: number;
  rights: 'shop-owned-unapproved';
}

const CLASSIC = { th: 'ช่อดอกไม้สด', en: 'Classic Flower Bouquet' };
const CLASSIC_CAP = 'ช่อดอกไม้สด Classic Flower Bouquet';

const raw: Omit<Work, 'no' | 'rights'>[] = [
  {
    id: 'DWs8CidAUfz', date: '2026-04-04', name: CLASSIC, caption: CLASSIC_CAP,
    seen: { th: 'กุหลาบพันธุ์สวนสีปะการังและชมพู แซมดอกสต็อกสีขาว', en: 'Coral and pink garden roses, loosened with white stock' },
    colours: ['peach', 'pink'], note: '#D46A55', format: 'bouquet', w: 640, h: 640,
  },
  {
    id: 'DXd1mNPgZii', date: '2026-04-23', name: CLASSIC, caption: CLASSIC_CAP,
    seen: { th: 'กุหลาบชมพูหลายเฉด แทรกกุหลาบสีเทาหม่น', en: 'Roses in several pinks, cut with dusty grey roses' },
    colours: ['pink'], note: '#D8879A', format: 'bouquet', w: 640, h: 640,
  },
  {
    id: 'DX85V6FgVzg', date: '2026-05-05',
    name: { th: 'ช่อกุหลาบ', en: 'Roses, chosen' },
    caption: 'When you choose a color, variety or number of roses for someone, you are personalizing your gift with deeper sentiment.',
    seen: { th: 'กุหลาบโทนพาสเทล ดอกเดลฟิเนียมสีฟ้า และลูกไม้สีขาว', en: 'Pastel roses with pale blue delphinium and white lace flower' },
    colours: ['pink', 'white'], note: '#E4B2AC', format: 'bouquet', w: 640, h: 640,
  },
  {
    id: 'DYtVo3ZgduE', date: '2026-05-23', name: CLASSIC, caption: CLASSIC_CAP,
    seen: { th: 'กุหลาบม่วงอ่อนและขาว ห่อด้วยกระดาษเขียวเสจ', en: 'Lavender and white roses in sage-green wrap' },
    colours: ['lavender', 'white'], note: '#B3A8BE', format: 'bouquet', w: 640, h: 640,
  },
  {
    id: 'DZWpv9iATQ4', date: '2026-06-08', name: CLASSIC, caption: CLASSIC_CAP,
    seen: { th: 'กุหลาบคละสี ชมพู ปะการัง และม่วง จัดทรงกลมแน่น', en: 'A dense dome of roses — pink, coral and lilac' },
    colours: ['pink', 'peach', 'lavender'], note: '#E0707F', format: 'bouquet', w: 640, h: 640,
  },
  {
    id: 'DZogaHrAYa5', date: '2026-06-15',
    name: { th: 'ช่อดอกพิโอนี', en: 'Peonies' },
    caption: 'Nothing says springtime quite like a bouquet of peonies for Valentine’s Day',
    seen: { th: 'พิโอนีสีชมพูเข้มและชมพูอ่อน ริบบิ้นลายทาง', en: 'Deep and pale pink peonies, striped ribbon' },
    colours: ['pink'], note: '#E49BC0', occasion: 'valentines', format: 'bouquet', w: 640, h: 640,
  },
  {
    id: 'Da2GRv_geDn', date: '2026-07-16', name: CLASSIC, caption: CLASSIC_CAP,
    seen: { th: 'กุหลาบพีช ส้ม และชมพู กับผลไฮเปอริคัมสีเขียว', en: 'Peach, apricot and pink roses with green hypericum berries' },
    colours: ['peach', 'pink'], note: '#E5936F', format: 'bouquet', w: 640, h: 640,
  },
  {
    id: 'DbIKVRSgVKW', date: '2026-07-23',
    name: { th: 'ช่อทิวลิปขาว', en: 'White tulips' },
    caption: 'ช่อทิวลิปขาว',
    seen: { th: 'ทิวลิปขาวล้วน ริบบิ้นชมพูลายทาง', en: 'Nothing but white tulips, pink striped ribbon' },
    colours: ['white'], note: '#EFEBDD', format: 'bouquet', w: 640, h: 640,
  },
  {
    id: 'Db2W2BqgXbk', date: '2026-08-09', name: CLASSIC, caption: CLASSIC_CAP,
    seen: { th: 'กุหลาบม่วงอ่อน ไฮเดรนเยีย ห่อกระดาษลายตารางสีม่วง', en: 'Lilac roses and hydrangea in lilac gingham paper' },
    colours: ['lavender'], note: '#A28FC2', format: 'bouquet', w: 636, h: 640,
  },
  {
    id: 'Db7cIc-jgC7', date: '2026-08-11',
    name: { th: 'วันแม่', en: 'Mother’s Day' },
    caption: 'Happy Mother’s Day',
    seen: { th: 'ทิวลิปเหลืองและฟ้าในแจกันแก้ว ผูกริบบิ้นเงิน', en: 'Yellow and blue tulips in a glass vase, silver ribbon' },
    colours: ['yellow', 'blue'], note: '#EDCB4B', occasion: 'mothers-day', format: 'vase', w: 512, h: 640,
  },
  {
    id: 'Dcc0QsXgRFW', date: '2026-08-24',
    name: { th: 'ไฮเดรนเยียฟ้า', en: 'Light blue hydrangea' },
    caption:
      'The uplifting color of the skies are set to brighten their day with fresh radiance with this bouquet of light blue hydrangea simply set in bouquet style to create an expression of your warmest sentiments.',
    seen: { th: 'ไฮเดรนเยียฟ้า กุหลาบพีชและขาว', en: 'Light blue hydrangea with peach and white roses' },
    colours: ['blue', 'peach', 'white'], note: '#6F92D2', format: 'bouquet', w: 640, h: 640,
  },
  {
    id: 'DdLG95xiV-c', date: '2026-09-11', name: CLASSIC, caption: CLASSIC_CAP,
    seen: { th: 'กุหลาบพันธุ์สวนสีครีมและขาว ใบยูคาลิปตัส', en: 'Cream and white garden roses with eucalyptus' },
    colours: ['white'], note: '#EDE2C9', format: 'bouquet', w: 640, h: 640,
  },
];

import extraRaw from './extra-works.json';

type Extra = { id: string; w: number; h: number; colours: ColourFamily[]; note: string; format: 'bouquet' | 'box' | 'vase'; occasion?: Occasion };
const BOX = { th: 'กล่องดอกไม้', en: 'Flower box' };
const VASE = { th: 'ดอกไม้ในแจกัน', en: 'Flowers in a vase' };
const TREE = { th: 'ต้นคริสต์มาสดอกไม้', en: 'Christmas flower tree' };
const extra: Omit<Work, 'no' | 'rights'>[] = (extraRaw as Extra[]).map((x) => ({
  id: x.id,
  date: '',
  name: x.occasion === 'christmas' ? TREE : x.format === 'box' ? BOX : x.format === 'vase' ? VASE : CLASSIC,
  caption: '',
  occasion: x.occasion,
  seen: { th: '', en: '' },
  colours: x.colours,
  note: x.note,
  format: x.format,
  w: x.w,
  h: x.h,
  source: 'saved',
  lowres: Math.max(x.w, x.h) < 1000,
}));

export const works: Work[] = [...extra, ...raw.map((w) => ({ ...w, source: 'instagram' as const }))].map((w, i) => ({ ...w, no: i + 1, rights: 'shop-owned-unapproved' }));

/** Newest first, as the shop's grid runs. */
/**
 * Newest first. The saved photos include several angles of the same arrangement next to each other,
 * so they are spread out (every 7th in turn) to keep neighbouring cards different.
 */
const ig = works.filter((w) => w.source === 'instagram').reverse();
const saved = works.filter((w) => w.source === 'saved');
const spread = [...saved.keys()].sort((a, b) => (a % 7) - (b % 7) || a - b).map((i) => saved[i]);
export const worksNewest = [...ig, ...spread];
// Number the catalogue in the order it is shown, so the gallery counts down without jumps.
worksNewest.forEach((w, i) => {
  w.no = worksNewest.length - i;
});
/** Only the posts that exist on Instagram — for the feed page and the home strip. */
export const igNewest = worksNewest.filter((w) => w.source === 'instagram');

export const getWork = (id: string) => works.find((w) => w.id === id);

export const colourFamilies: { key: ColourFamily; th: string; en: string; swatch: string }[] = [
  { key: 'white', th: 'ขาว ครีม', en: 'White & cream', swatch: '#EFE9DB' },
  { key: 'pink', th: 'ชมพู', en: 'Pink', swatch: '#DE8FA2' },
  { key: 'peach', th: 'พีช ปะการัง', en: 'Peach & coral', swatch: '#E08A68' },
  { key: 'lavender', th: 'ม่วงอ่อน', en: 'Lilac', swatch: '#A898C6' },
  { key: 'blue', th: 'ฟ้า', en: 'Blue', swatch: '#7094D0' },
  { key: 'yellow', th: 'เหลือง', en: 'Yellow', swatch: '#E9C84E' },
  { key: 'red', th: 'แดง', en: 'Red', swatch: '#B3303A' },
];

export const photo = (id: string) => `/works/${id}.jpg`;
export const postUrl = (id: string) => `https://www.instagram.com/louvrefleuriste/p/${id}/`;
