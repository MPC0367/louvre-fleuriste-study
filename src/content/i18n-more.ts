import type { Lang } from './i18n';

const th = {
  hero: {
    showing: 'ช่อที่กำลังแสดง',
    show: (n: number) => `ดูช่อลำดับ ${n}`,
    pause: 'หยุด',
    play: 'เล่นต่อ',
  },
  year: {
    kicker: 'เทศกาลที่ร้านทำทุกปี',
    title: 'ปีหนึ่งของร้านดอกไม้',
    now: 'ตอนนี้',
    next: 'เทศกาลถัดไป',
    inDays: (n: number) => (n === 0 ? 'วันนี้' : n === 1 ? 'พรุ่งนี้' : `อีก ${n} วัน`),
    days: (_n: number) => 'วัน',
    today: 'วันนี้',
    order: 'สั่งล่วงหน้า',
    see: 'ดูผลงาน',
    works: (n: number) => `${n} ช่อจากร้าน`,
    pending: 'รอรูปจากร้าน',
  },
  monthsShort: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  visit: {
    kicker: 'สตูดิโอของร้าน',
    title: 'มารับดอกไม้ หรือแวะมาคุย',
    listing: 'ที่อยู่ตาม Google Maps',
    confirm: 'อินสตาแกรมของร้านระบุว่าอยู่แถวสุขุมวิท 77 รอร้านยืนยันว่าที่ไหนเป็นที่อยู่ปัจจุบัน',
    phones: 'โทร',
    line: 'LINE',
    shop: 'หน้าร้าน',
    shopPending: 'รอรูปหน้าร้านจากร้าน',
    directions: 'นำทาง',
  },
  works: { occasion: 'เทศกาล' },
};

type D = typeof th;

const en: D = {
  hero: {
    showing: 'Now showing',
    show: (n: number) => `Show bouquet No. ${n}`,
    pause: 'Pause',
    play: 'Play',
  },
  year: {
    kicker: 'Occasions the shop makes for every year',
    title: 'A florist’s year',
    now: 'Now',
    next: 'Next occasion',
    inDays: (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`),
    days: (n: number) => (n === 1 ? 'day' : 'days'),
    today: 'Today',
    order: 'Order ahead',
    see: 'See the work',
    works: (n: number) => `${n} from the shop`,
    pending: 'Photographs to come from the shop',
  },
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  visit: {
    kicker: 'The studio',
    title: 'Collect your flowers, or come and talk them through',
    listing: 'Address on Google Maps',
    confirm: 'The shop’s Instagram says it is off Sukhumvit 77. Waiting for the shop to confirm which address is current.',
    phones: 'Call',
    line: 'LINE',
    shop: 'The shop front',
    shopPending: 'Shop-front photograph to come from the shop',
    directions: 'Directions',
  },
  works: { occasion: 'Occasion' },
};

export const more: Record<Lang, D> = { th, en };
