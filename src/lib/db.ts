import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { addDays, rules, todayBangkok } from './rules';

/** Local preview database. Lives in .data/ (git-ignored). Every row is stamped demo = 1. */
const DIR = resolve(process.env.LF_DATA_DIR ?? '.data');
export const UPLOAD_DIR = join(DIR, 'uploads');

let db: DatabaseSync | undefined;

export function getDb() {
  if (db) return db;
  mkdirSync(UPLOAD_DIR, { recursive: true });
  db = new DatabaseSync(join(DIR, 'louvre.sqlite'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS orders (
      ref TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      idem_key TEXT UNIQUE NOT NULL,
      created_iso TEXT NOT NULL,
      created_local TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      payment TEXT NOT NULL DEFAULT 'unpaid',
      lang TEXT NOT NULL,
      kind TEXT NOT NULL,
      work_id TEXT,
      budget INTEGER NOT NULL,
      colour TEXT,
      occasion TEXT,
      flowers TEXT,
      upload_id TEXT,
      date TEXT NOT NULL,
      window_id TEXT NOT NULL,
      method TEXT NOT NULL,
      recipient_name TEXT,
      recipient_phone TEXT,
      address TEXT,
      subdistrict TEXT,
      district TEXT,
      province TEXT,
      postcode TEXT,
      instructions TEXT,
      card TEXT,
      sender_name TEXT NOT NULL,
      sender_phone TEXT NOT NULL,
      email TEXT,
      notes TEXT,
      internal_notes TEXT,
      demo INTEGER NOT NULL DEFAULT 1,
      seed INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS orders_date ON orders(date, window_id, status);
    CREATE TABLE IF NOT EXISTS blocked_dates (
      date TEXT PRIMARY KEY,
      reason TEXT,
      created_iso TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      file TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_iso TEXT NOT NULL
    );
  `);
  seed(db);
  return db;
}

/**
 * Sample orders, so the admin and the full / nearly-full calendar states can be reviewed. Every row is
 * seed = 1 and re-created relative to today on each start (edits made in the admin reset on restart).
 * Names, phones, addresses and card messages are invented and marked as samples on screen.
 */
const NAMES = ['ปอย ศ.', 'Mild K.', 'คุณแพร', 'Tanya R.', 'คุณบีม', 'Nok P.', 'คุณเฟิร์น', 'James L.', 'คุณมิ้นท์', 'Aom W.', 'คุณต้น', 'Fah S.', 'คุณจูน', 'Ken T.', 'คุณพลอย', 'May C.'];
const RECIPS = ['คุณแม่', 'Nina', 'คุณยาย', 'Pim', 'คุณครู', 'Joy', 'พี่สาว', 'Ann'];
const CARDS = [
  'สุขสันต์วันเกิดนะแม่ รักที่สุด',
  'Happy anniversary — five years and counting.',
  'ยินดีด้วยกับการเรียนจบนะ',
  'Thank you for everything this year.',
  'ขอให้หายไว ๆ นะ',
  'For no reason at all. x',
];
const WORK_IDS = ['DdLG95xiV-c', 'Dcc0QsXgRFW', 'DZogaHrAYa5', 'DbIKVRSgVKW', null, 'Da2GRv_geDn', null, 'DZWpv9iATQ4'];
const COLOURS = ['white', 'blue', 'pink', 'white', 'lavender', 'peach', 'any', 'pink'];

function seed(d: DatabaseSync) {
  d.exec('DELETE FROM orders WHERE seed = 1');
  const today = todayBangkok();
  const ins = d.prepare(
    `INSERT INTO orders (ref, token_hash, idem_key, created_iso, created_local, status, payment, lang, kind, work_id, budget, colour, occasion, flowers,
      date, window_id, method, recipient_name, recipient_phone, address, subdistrict, district, province, postcode, instructions, card,
      sender_name, sender_phone, notes, internal_notes, seed)
     VALUES (?, 'x', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  const wins = rules.windows.map((w) => w.id);
  let n = 0;
  const put = (offset: number, status: string, payment: string, opts: { win?: string; method?: 'delivery' | 'pickup'; kind?: 'bouquet' | 'box'; notes?: string; internal?: string } = {}) => {
    const i = n++;
    const date = addDays(today, offset);
    const kind = opts.kind ?? (i % 5 === 3 ? 'box' : 'bouquet');
    const method = opts.method ?? (i % 3 === 1 ? 'pickup' : 'delivery');
    const created = new Date(Date.now() - (Math.max(1, 3 - offset) * 86400000 + i * 3600000));
    const budgets = kind === 'box' ? [2000, 3000, 4500] : [2500, 3500, 5000, 4200];
    ins.run(
      `LF-S${String(i + 1).padStart(5, '0')}`, `sample-${i}`, created.toISOString(),
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }).format(created) + ' (Bangkok)',
      status, payment, i % 3 === 2 ? 'en' : 'th', kind, kind === 'box' ? null : WORK_IDS[i % WORK_IDS.length], budgets[i % budgets.length],
      COLOURS[i % COLOURS.length], i % 4 === 0 ? 'mothers-day' : i % 4 === 1 ? 'birthday' : null, i % 3 === 0 ? 'ไม่เอาลิลลี่' : null,
      date, opts.win ?? wins[i % wins.length], method,
      method === 'delivery' ? RECIPS[i % RECIPS.length] : null, method === 'delivery' ? `08000002${String(i).padStart(2, '0')}` : null,
      method === 'delivery' ? `ที่อยู่ตัวอย่าง ${10 + i}/${i + 1} ซอยสุขุมวิท ${50 + i * 2}` : null,
      method === 'delivery' ? 'พระโขนงเหนือ' : null, method === 'delivery' ? 'วัฒนา' : null, method === 'delivery' ? 'กรุงเทพมหานคร' : null,
      method === 'delivery' ? '10110' : null, method === 'delivery' && i % 2 ? 'ฝากไว้ที่ล็อบบี้' : null,
      CARDS[i % CARDS.length], NAMES[i % NAMES.length], `08000001${String(i).padStart(2, '0')}`, opts.notes ?? null, opts.internal ?? null,
    );
  };
  put(-2, 'completed', 'paid');
  put(-2, 'completed', 'paid', { method: 'pickup' });
  put(-1, 'completed', 'paid');
  put(-1, 'cancelled', 'unpaid', { internal: 'ลูกค้ายกเลิกทางโทรศัพท์' });
  put(0, 'out_for_delivery', 'paid', { win: 'am', method: 'delivery' });
  put(0, 'ready', 'paid', { win: 'pm', method: 'pickup' });
  put(0, 'preparing', 'deposit', { win: 'eve', method: 'delivery', internal: 'รอไฮเดรนเยียเข้าช่วงบ่าย' });
  put(1, 'confirmed', 'paid');
  put(1, 'confirmed', 'deposit');
  put(1, 'new', 'unpaid', { notes: 'อยากได้ริบบิ้นสีเงินแบบในรูป' });
  // Day +2: the morning window is full.
  for (let k = 0; k < rules.windows[0].capacity; k++) put(2, k < 2 ? 'confirmed' : 'new', k < 2 ? 'paid' : 'unpaid', { win: 'am' });
  put(3, 'new', 'unpaid', { notes: 'ขอโทนเดียวกับไฮเดรนเยียฟ้า' });
  put(3, 'new', 'unpaid', { kind: 'box' });
  // Day +4: the whole day is booked — the calendar shows it as full.
  const caps = rules.windows.map((w) => w.capacity);
  const counts = [0, 0, 0];
  for (let k = 0; k < rules.dailyCapacity; k++) {
    let w = k % wins.length;
    while (counts[w] >= caps[w]) w = (w + 1) % wins.length;
    counts[w]++;
    put(4, k < 6 ? 'confirmed' : 'new', k < 4 ? 'paid' : k < 6 ? 'deposit' : 'unpaid', { win: wins[w] });
  }
  put(6, 'new', 'unpaid');
  put(9, 'confirmed', 'deposit');

  // One sample order carries a customer reference picture (a screenshot of one of the shop's posts).
  const src = join(process.cwd(), 'public', 'works', 'DXd1mNPgZii.jpg');
  const id = '5a3e1f00c0ffee0000000001';
  if (existsSync(src)) {
    copyFileSync(src, join(UPLOAD_DIR, `${id}.jpg`));
    d.prepare('INSERT OR REPLACE INTO uploads (id, file, mime, size, created_iso) VALUES (?, ?, ?, 0, ?)').run(id, `${id}.jpg`, 'image/jpeg', new Date().toISOString());
    d.prepare('UPDATE orders SET upload_id = ? WHERE ref = ?').run(id, 'LF-S00015');
  }
}

export const ACTIVE = `status NOT IN ('cancelled', 'rejected')`;
