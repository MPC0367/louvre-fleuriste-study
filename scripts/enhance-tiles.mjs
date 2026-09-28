// Finishes the tiles cut from the grid screenshots after AI super-resolution
// (scripts/superres-batch.py, EDSR x4, local) and files each as its own photo in documents/more-photos/.
//   documents/grid-tiles/<k>.jpg  →  documents/grid-tiles-x4/<k>.png  →  documents/more-photos/grid-<k>[-kind].jpg
// Falls back to a Lanczos upscale for any tile without a super-resolved version.
// The filename carries the kind (box / vase / christmas) for scripts/photos.mjs.
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '../documents/grid-tiles';
// The studio's own enhanced photos (2026-09-28, from "enhanced images", kept in documents/studio-enhanced/).
// Numbered by upload order: 002-061 are the grid tiles 8-01 to 9-30 in order (checked side by side in
// .cache/enhanced-match/pairs.jpg); they replace the AI upscales. 001 and 062-083 are not in the grid
// screenshots, so they are added as new works. 018 is tile 8-17, the closed-notice post, still skipped.
const STUDIO = '../documents/studio-enhanced';
const studio = existsSync(STUDIO) ? readdirSync(STUDIO).filter((f) => /\.jpe?g$/i.test(f)).sort() : [];
const GRID_ORDER = readdirSync(SRC).filter((f) => /^[89]-/.test(f)).sort().map((f) => f.replace('.jpg', ''));
const studioFor = Object.fromEntries(studio.slice(1, 61).map((f, i) => [GRID_ORDER[i], f]));
const STUDIO_NEW = studio.filter((_, i) => i === 0 || i >= 61);
const STUDIO_BOX = new Set(['069']);
const X4 = '../documents/grid-tiles-x4';
const OUT = '../documents/more-photos';
mkdirSync(OUT, { recursive: true });

const SKIP = new Set(['8-17']); // a notice printed across the photo
const BOX = ['7-06', '7-07', '7-08', '8-21', '8-22', '8-23', '8-24', '8-25', '8-26', '8-30', '9-01', '9-02', '9-03', '9-04', '9-05', '9-06', '9-07'];
const CHRISTMAS = ['8-01', '8-02', '8-03', '8-04'];
const VASE = ['7-22', '7-23', '7-24'];
// Tiles the visual QA judged better with the plain upscale (model artefacts), from the 2026-09-28 review.
const PLAIN = new Set(['8-28', ...(process.env.LF_PLAIN_TILES ? process.env.LF_PLAIN_TILES.split(',') : [])]);
// Tiles where the model smeared one corner: that corner (a feathered ellipse, in output pixels) is
// taken from the plain upscale instead, and the rest keeps the AI detail.
const CORNER = {
  '8-14': { cx: 680, cy: 20, rx: 95, ry: 80, blur: 14 },
  '8-16': { cx: 50, cy: 30, rx: 150, ry: 95, blur: 16 },
};
const plainUp = (file, w, h) => sharp(file).resize(w, h, { kernel: 'lanczos3' }).sharpen({ sigma: 1.1, m1: 0.6, m2: 2.2 });

async function blendCorner(buf, file, c) {
  const { width: W, height: H } = await sharp(buf).metadata();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/><ellipse cx="${c.cx}" cy="${c.cy}" rx="${c.rx}" ry="${c.ry}" fill="#fff"/></svg>`;
  const mask = await sharp(Buffer.from(svg)).blur(c.blur).extractChannel(0).raw().toBuffer();
  const plain = await plainUp(file, W, H).removeAlpha().raw().toBuffer();
  const over = await sharp(plain, { raw: { width: W, height: H, channels: 3 } }).joinChannel(mask, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  return sharp(buf).composite([{ input: over }]);
}

let n = 0, ai = 0, studioN = 0;
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.jpg')).sort()) {
  const key = f.replace('.jpg', '');
  if (SKIP.has(key)) continue;
  const kind = CHRISTMAS.includes(key) ? '-christmas-box' : BOX.includes(key) ? '-box' : VASE.includes(key) ? '-vase' : '';
  const x4 = join(X4, `${key}.png`);
  let img;
  if (studioFor[key]) {
    // Used as supplied, only sized down for the web (photos.mjs makes the 1440px site copy).
    img = sharp(join(STUDIO, studioFor[key])).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true });
    studioN++;
  } else if (existsSync(x4) && !PLAIN.has(key)) {
    img = sharp(x4).sharpen({ sigma: 1.4, m1: 1.0, m2: 2.6 }).linear(1.06, -7).modulate({ saturation: 1.05 });
    ai++;
  } else if (PLAIN.has(key)) {
    const { width, height } = await sharp(join(SRC, f)).metadata();
    img = plainUp(join(SRC, f), width * 4, height * 4);
  } else {
    const { width, height } = await sharp(join(SRC, f)).metadata();
    img = sharp(join(SRC, f)).resize(width * 4, height * 4, { kernel: 'lanczos3' }).median(3).sharpen({ sigma: 1.1, m1: 0.6, m2: 2.2 }).modulate({ saturation: 1.06, brightness: 1.01 });
  }
  if (CORNER[key] && !studioFor[key]) img = await blendCorner(await img.png().toBuffer(), join(SRC, f), CORNER[key]);
  await img.jpeg({ quality: 90, mozjpeg: true }).toFile(join(OUT, `grid-${key}${kind}.jpg`));
  n++;
}
for (const f of STUDIO_NEW) {
  const no = f.slice(0, 3);
  await sharp(join(STUDIO, f)).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90, mozjpeg: true }).toFile(join(OUT, `studio-${no}${STUDIO_BOX.has(no) ? '-box' : ''}.jpg`));
}
console.log(`tiles: ${n} photos (${studioN} studio-enhanced, ${ai} AI-enhanced), plus ${STUDIO_NEW.length} new studio photos → ${OUT}`);
