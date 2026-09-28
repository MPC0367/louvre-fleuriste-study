import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { todayBangkok } from './rules';
import { SAMPLE_UPLOAD, seedOrders } from './engine';

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
 * Sample orders (lib/engine.ts seedOrders), re-created relative to today on each start, so edits made in
 * the admin reset on restart. The same rows seed the static demo in the visitor's browser.
 */
function seed(d: DatabaseSync) {
  d.exec('DELETE FROM orders WHERE seed = 1');
  const rows = seedOrders(todayBangkok(), Date.now());
  const cols = Object.keys(rows[0]) as (keyof (typeof rows)[number])[];
  const ins = d.prepare(`INSERT INTO orders (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`);
  for (const r of rows) ins.run(...cols.map((c) => r[c]));
  // The sample reference picture: a screenshot of one of the shop's posts.
  const src = join(process.cwd(), 'public', 'works', `${SAMPLE_UPLOAD.work}.jpg`);
  if (existsSync(src)) {
    copyFileSync(src, join(UPLOAD_DIR, `${SAMPLE_UPLOAD.id}.jpg`));
    d.prepare('INSERT OR REPLACE INTO uploads (id, file, mime, size, created_iso) VALUES (?, ?, ?, 0, ?)').run(SAMPLE_UPLOAD.id, `${SAMPLE_UPLOAD.id}.jpg`, 'image/jpeg', new Date().toISOString());
  } else d.prepare('UPDATE orders SET upload_id = NULL WHERE ref = ?').run(SAMPLE_UPLOAD.ref);
}

export const ACTIVE = `status NOT IN ('cancelled', 'rejected')`;
