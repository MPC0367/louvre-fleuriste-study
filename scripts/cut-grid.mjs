// Cuts screenshots of the shop's Instagram/Facebook photo grids (documents/grid-screenshots/*)
// into single tiles in documents/grid-tiles/. Gaps are found as runs of the dark UI background.
import sharp from 'sharp';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '../documents/grid-screenshots';
const OUT = '../documents/grid-tiles';
mkdirSync(OUT, { recursive: true });

function runs(flags, minLen) {
  const out = [];
  let start = -1;
  flags.forEach((f, i) => {
    if (f && start < 0) start = i;
    if ((!f || i === flags.length - 1) && start >= 0) {
      const end = f ? i : i - 1;
      if (end - start + 1 >= minLen) out.push([start, end]);
      start = -1;
    }
  });
  return out;
}

for (const f of readdirSync(SRC).filter((x) => /\.(webp|png|jpe?g)$/i.test(x)).sort()) {
  const img = sharp(join(SRC, f));
  const { data, info } = await img.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const isBg = (x, y) => {
    const i = (y * W + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && r < 70;
  };
  const colBg = Array.from({ length: W }, (_, x) => { let n = 0; for (let y = 0; y < H; y += 3) n += isBg(x, y); return n / Math.ceil(H / 3) > 0.9; });
  const rowBg = Array.from({ length: H }, (_, y) => { let n = 0; for (let x = 0; x < W; x += 3) n += isBg(x, y); return n / Math.ceil(W / 3) > 0.9; });
  const cols = runs(colBg.map((b) => !b), 100);
  const rows = runs(rowBg.map((b) => !b), 100);
  let k = 0;
  for (const [y0, y1] of rows) for (const [x0, x1] of cols) {
    const inset = 3; // skip the rounded corners' antialiasing
    await sharp(join(SRC, f)).extract({ left: x0 + inset, top: y0 + inset, width: x1 - x0 + 1 - inset * 2, height: y1 - y0 + 1 - inset * 2 }).jpeg({ quality: 92 }).toFile(join(OUT, `${f.replace(/\.\w+$/, '')}-${String(++k).padStart(2, '0')}.jpg`));
  }
  console.log(f, `${cols.length} cols × ${rows.length} rows`, cols.map(([a, b]) => b - a + 1).join(','));
}
