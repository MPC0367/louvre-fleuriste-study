// Copies the shop's photographs into public/works/ for local preview, and ingests any extra ones.
//   ../documents/instagram-2026-09-27/*.jpg   the twelve Instagram posts (named by shortcode)
//   ../documents/more-photos/*                any further photos of the shop's work, saved by hand.
//     Each is resized, given an id, and sorted into colour families by reading its pixels; the result
//     is written to src/content/extra-works.json. A filename containing "box" marks a flower box.
// The photographs belong to Louvre Fleuriste and are never committed (see .gitignore and NOTICE.md).
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, '..', 'documents');
const dest = join(root, 'public', 'works');
mkdirSync(dest, { recursive: true });

const ig = join(docs, 'instagram-2026-09-27');
if (existsSync(ig)) {
  const files = readdirSync(ig).filter((f) => f.endsWith('.jpg'));
  const enhanced = join(docs, 'instagram-enhanced');
  let e = 0;
  for (const f of files) {
    const better = join(enhanced, f);
    if (existsSync(better)) { cpSync(better, join(dest, f)); e++; } else cpSync(join(ig, f), join(dest, f));
  }
  console.log(`photos: ${files.length} Instagram photographs (${e} AI-enhanced)`);
}

const shopFront = join(docs, 'brand', 'shop-front.jpg');
if (existsSync(shopFront)) cpSync(shopFront, join(dest, 'shop-front.jpg'));

const moreDir = join(docs, 'more-photos');
const extra = [];
if (existsSync(moreDir)) {
  const files = readdirSync(moreDir).filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort();
  for (const f of files) {
    const slug = basename(f, extname(f)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'photo';
    const id = `x-${slug}`;
    const out = join(dest, `${id}.jpg`);
    const img = sharp(join(moreDir, f)).rotate();
    const meta = await img.metadata();
    const info = await img.clone().resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
    const { colours, note } = await classify(join(moreDir, f));
    extra.push({ id, file: f, w: info.width, h: info.height, colours, note, format: /box/i.test(f) ? 'box' : /vase/i.test(f) ? 'vase' : 'bouquet', occasion: /christmas/i.test(f) ? 'christmas' : undefined, src: meta.format });
  }
}
writeFileSync(join(root, 'src', 'content', 'extra-works.json'), JSON.stringify(extra, null, 1) + '\n');

// Lifestyle: people receiving and holding the shop's bouquets (documents/lifestyle/).
const lifeDir = join(docs, 'lifestyle');
const life = [];
if (existsSync(lifeDir)) {
  for (const f of readdirSync(lifeDir).filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f)).sort()) {
    const id = 'l-' + (basename(f, extname(f)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'photo');
    const info = await sharp(join(lifeDir, f)).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 92, mozjpeg: true }).toFile(join(dest, `${id}.jpg`));
    life.push({ id, w: info.width, h: info.height });
  }
}
writeFileSync(join(root, 'src', 'content', 'lifestyle.json'), JSON.stringify(life, null, 1) + '\n');
console.log(`photos: ${life.length} lifestyle photographs from documents/lifestyle/`);
console.log(`photos: ${extra.length} extra photographs from documents/more-photos/`);

/** Reads the centre of the photo (where the flowers are) and names its dominant colour families. */
async function classify(file) {
  const { data, info } = await sharp(file).rotate().resize(48, 48, { fit: 'cover' }).extract({ left: 8, top: 6, width: 32, height: 32 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = { white: 0, pink: 0, red: 0, peach: 0, yellow: 0, lavender: 0, blue: 0 };
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
    const warmPale = l > 0.7 && (h < 75 || h >= 330) && s < 0.6;
    if ((l > 0.78 && s < 0.35) || (warmPale && !(h >= 330 || h < 20))) { bins.white++; continue; } // white, cream, ivory
    if (h >= 240 && h < 318 && s > 0.1 && l > 0.35) { bins.lavender++; continue; } // lilac is pale and greyed
    if (s < 0.25 || l < 0.2) continue; // wrap, curtain, shadow
    sr += r; sg += g; sb += b; n++;
    if (h >= 338 || h < 8) bins[l < 0.42 && s > 0.45 ? 'red' : 'pink']++;
    else if (h < 45) bins[l < 0.4 && s > 0.45 ? 'red' : 'peach']++;
    else if (h < 72) { if (s > 0.5 && l < 0.8) bins.yellow++; }
    else if (h < 175) continue; // leaves
    else if (h < 240) bins.blue++;
    else bins.pink++;
  }
  const total = Object.values(bins).reduce((a, b) => a + b, 0) || 1;
  const colours = Object.entries(bins).filter(([k, v]) => v / total > (k === 'peach' ? 0.24 : 0.16)).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 3);
  const hex = (v) => Math.round((v / Math.max(1, n)) * 255).toString(16).padStart(2, '0');
  return { colours: colours.length ? colours : ['white'], note: `#${hex(sr)}${hex(sg)}${hex(sb)}` };
}
