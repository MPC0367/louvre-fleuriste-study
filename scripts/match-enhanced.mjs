// Matches the studio's enhanced photos (documents/facebook-gallery-2026-09-28/enhanced, named by gallery order) to the grid
// tiles they replace (documents/grid-tiles/<k>.jpg), by comparing small colour thumbnails of the square
// centre crop — the crop the feed grid shows. Writes .cache/enhanced-match/match.json for review.
import sharp from 'sharp';
import { readdirSync, writeFileSync } from 'node:fs';
const S = 20;
const ENH = '../documents/facebook-gallery-2026-09-28/enhanced';
const TILES = '../documents/grid-tiles';
const vec = async (file, inset = 0) => {
  const { width: w, height: h } = await sharp(file).metadata();
  const side = Math.min(w, h) * (1 - inset);
  const left = Math.round((w - side) / 2), top = Math.round((h - side) / 2);
  const b = await sharp(file).extract({ left, top, width: Math.round(side), height: Math.round(side) }).resize(S, S, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const a = Float32Array.from(b);
  const mean = a.reduce((s, x) => s + x, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - mean) ** 2, 0) / a.length) || 1;
  return a.map((x) => (x - mean) / sd);
};
const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s / a.length); };
const enh = readdirSync(ENH).filter((f) => /\.jpe?g$/i.test(f)).sort();
const tiles = readdirSync(TILES).filter((f) => f.endsWith('.jpg')).sort();
const E = await Promise.all(enh.map(async (f) => [await vec(`${ENH}/${f}`), await vec(`${ENH}/${f}`, 0.04)]));
const T = await Promise.all(tiles.map((f) => vec(`${TILES}/${f}`)));
const cost = E.map((ev) => T.map((tv) => Math.min(dist(ev[0], tv), dist(ev[1], tv))));
// Greedy global assignment: repeatedly take the closest remaining pair.
const pairs = [];
cost.forEach((row, i) => row.forEach((c, j) => pairs.push([c, i, j])));
pairs.sort((a, b) => a[0] - b[0]);
const usedE = new Set(), usedT = new Set(), out = [];
for (const [c, i, j] of pairs) {
  if (usedE.has(i) || usedT.has(j)) continue;
  usedE.add(i); usedT.add(j);
  const sorted = [...cost[i]].sort((a, b) => a - b);
  out.push({ enhanced: enh[i], tile: tiles[j].replace('.jpg', ''), d: +c.toFixed(3), best: +sorted[0].toFixed(3), second: +sorted[1].toFixed(3) });
}
out.sort((a, b) => a.enhanced.localeCompare(b.enhanced));
writeFileSync('.cache/enhanced-match/match.json', JSON.stringify(out, null, 1));
console.log('unmatched tiles:', tiles.filter((_, j) => !usedT.has(j)).join(', '));
console.log('not own best / weak margin:');
for (const m of out) if (m.d > m.best + 1e-6 || m.second - m.best < 0.15 || m.d > 0.5) console.log(' ', JSON.stringify(m));
console.log('d range', Math.min(...out.map((m) => m.d)), Math.max(...out.map((m) => m.d)));
