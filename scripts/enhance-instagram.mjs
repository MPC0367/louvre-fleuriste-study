// Finishes the 12 Instagram photos after AI super-resolution (scripts/superres-batch.py, EDSR x4, local).
//   documents/instagram-2026-09-27/<id>.jpg (640px) → documents/instagram-x4/<id>.png → documents/instagram-enhanced/<id>.jpg (1440px)
// scripts/photos.mjs serves the enhanced copy when it exists; the originals are never modified.
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const X4 = '../documents/instagram-x4';
const OUT = '../documents/instagram-enhanced';
mkdirSync(OUT, { recursive: true });
const SKIP = new Set(process.env.LF_PLAIN_IG ? process.env.LF_PLAIN_IG.split(',') : []);
let n = 0;
for (const f of readdirSync(X4).filter((x) => x.endsWith('.png'))) {
  const id = f.replace('.png', '');
  if (SKIP.has(id)) continue;
  await sharp(join(X4, f)).resize({ width: 1440, kernel: 'lanczos3' }).sharpen({ sigma: 1.1, m1: 0.7, m2: 2.2 }).modulate({ saturation: 1.04 }).jpeg({ quality: 90, mozjpeg: true }).toFile(join(OUT, `${id}.jpg`));
  n++;
}
console.log(`instagram: ${n} photos enhanced → ${OUT}`);
