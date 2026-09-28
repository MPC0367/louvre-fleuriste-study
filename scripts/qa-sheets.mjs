// Builds before/after contact sheets for visual QA of the enhanced photos (.cache/qa/sheet-NN.jpg).
// Each pair: left = original scaled up plainly, right = enhanced, same display size, labelled with its key.
import sharp from 'sharp';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const D = '../documents';
const pairs = [];
for (const f of readdirSync(join(D, 'grid-tiles')).filter((x) => x.endsWith('.jpg')).sort()) {
  const k = f.replace('.jpg', '');
  const out = readdirSync(join(D, 'more-photos')).find((x) => x.startsWith(`grid-${k}`));
  if (out) pairs.push({ key: `tile ${k}`, before: join(D, 'grid-tiles', f), after: join(D, 'more-photos', out) });
}
if (existsSync(join(D, 'instagram-enhanced')))
  for (const f of readdirSync(join(D, 'instagram-enhanced')).filter((x) => x.endsWith('.jpg')).sort())
    pairs.push({ key: `ig ${f.replace('.jpg', '')}`, before: join(D, 'instagram-2026-09-27', f), after: join(D, 'instagram-enhanced', f) });
pairs.push({ key: 'shop-front', before: join(D, 'brand', 'shop-front-crop.png'), after: join(D, 'brand', 'shop-front.jpg') });

const S = 280, PER = 10, COLS = 2; // 2 pairs per row, 5 rows per sheet
const label = (t) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${2 * S + 8}" height="20"><rect width="100%" height="100%" fill="#111"/><text x="6" y="15" font-size="14" font-family="Helvetica" fill="#fff">${t}  (left: original · right: enhanced)</text></svg>`);
const index = [];
for (let s = 0; s * PER < pairs.length; s++) {
  const chunk = pairs.slice(s * PER, s * PER + PER);
  const comps = [];
  for (let i = 0; i < chunk.length; i++) {
    const p = chunk[i];
    const x = (i % COLS) * (2 * S + 24), y = Math.floor(i / COLS) * (S + 28);
    const fit = { width: S, height: S, fit: 'contain', background: '#222', kernel: 'nearest' };
    comps.push({ input: label(p.key), left: x, top: y });
    comps.push({ input: await sharp(p.before).resize(fit).toBuffer(), left: x, top: y + 22 });
    comps.push({ input: await sharp(p.after).resize({ ...fit, kernel: 'lanczos3' }).toBuffer(), left: x + S + 8, top: y + 22 });
  }
  const rows = Math.ceil(chunk.length / COLS);
  const file = `.cache/qa/sheet-${String(s + 1).padStart(2, '0')}.jpg`;
  await sharp({ create: { width: COLS * (2 * S + 24), height: rows * (S + 28), channels: 3, background: '#fff' } }).composite(comps).jpeg({ quality: 88 }).toFile(file);
  index.push({ file, keys: chunk.map((p) => p.key) });
}
writeFileSync('.cache/qa/index.json', JSON.stringify(index, null, 1));
console.log(`qa: ${pairs.length} pairs on ${index.length} sheets`);
