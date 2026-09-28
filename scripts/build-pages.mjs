// Builds the static demo for GitHub Pages into out/ (npm run pages:build). Publish it with
// npm run pages:deploy. The site is served at https://mpc0367.github.io/louvre-fleuriste-study/.
//
// - Next.js static export (next.config.mjs, LF_STATIC=1) under the repository's sub-path.
// - Orders, the confirmation and the back office run in the visitor's browser (lib/demo-store.ts).
// - The API routes are for the local server; a static export cannot hold them, so they step aside
//   during the build and are always put back.
// - Every photo is pre-rendered as WebP at each width next/image asks for (lib/paths.ts IMAGE_WIDTHS).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

import { BASE, SITE } from './pages-config.mjs';
// With output: 'export', Next.js 15 writes the static site into its build folder, so that folder is out/.
const OUT = 'out';
const DIST = OUT;
const API = 'src/app/api';
const API_OFF = 'src/.api-off';
const WIDTHS = [96, 160, 240, 320, 360, 480, 640, 828, 1080, 1440, 1920];

const env = {
  ...process.env,
  LF_STATIC: '1',
  NEXT_PUBLIC_LF_STATIC: '1',
  NEXT_PUBLIC_BASE_PATH: BASE,
  NEXT_PUBLIC_SITE_URL: SITE,
  LF_ADMIN_DEMO: '1',
  NEXT_DIST_DIR: DIST,
  NEXT_TELEMETRY_DISABLED: '1',
};

function run(cmd, args, e = process.env) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: e });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`);
}

run('node', ['scripts/photos.mjs']);
rmSync(OUT, { recursive: true, force: true });

if (existsSync(API_OFF)) throw new Error(`${API_OFF} exists: a previous build was interrupted. Move it back to ${API} first.`);
renameSync(API, API_OFF);
try {
  run('npx', ['next', 'build'], env);
} finally {
  renameSync(API_OFF, API);
}
if (!existsSync(join(OUT, 'th', 'index.html'))) throw new Error(`${OUT}/th/index.html missing: the export did not land in ${OUT}/`);

// Photos: WebP at every width; never larger than the source.
const src = 'public/works';
const files = readdirSync(src).filter((f) => /\.jpe?g$/i.test(f));
mkdirSync(join(OUT, 'img'), { recursive: true });
let made = 0;
const jobs = files.flatMap((f) => WIDTHS.map((w) => [f, w]));
async function worker() {
  for (let job; (job = jobs.shift()); ) {
    const [f, w] = job;
    const name = f.replace(/\.[a-z]+$/i, '');
    await sharp(join(src, f))
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(join(OUT, 'img', `${name}-${w}.webp`));
    made++;
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
// The full-size JPEGs aren't requested by anything in the static site.
rmSync(join(OUT, 'works'), { recursive: true, force: true });

// GitHub Pages: serve folders that start with "_" (Next's _next/), and send the bare address to Thai.
writeFileSync(join(OUT, '.nojekyll'), '');
const hop = (to, title) =>
  `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${SITE}/th/"><script>location.replace(${JSON.stringify(to)} + location.search + location.hash)</script></head><body style="font-family:system-ui;background:#f4f1ec;color:#1f2f5c;padding:24px"><a href="${to}" style="color:inherit">Louvre Fleuriste</a></body></html>\n`;
writeFileSync(join(OUT, 'index.html'), hop(`${BASE}/th/`, 'Louvre Fleuriste'));
if (!existsSync(join(OUT, '404.html'))) writeFileSync(join(OUT, '404.html'), hop(`${BASE}/th/`, 'Louvre Fleuriste'));

const size = (d) => readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? size(join(d, e.name)) : statSync(join(d, e.name)).size), 0);
console.log(`pages: built ${OUT}/ for ${SITE}/ — ${made} photo sizes, ${(size(OUT) / 1024 / 1024).toFixed(1)} MB`);
