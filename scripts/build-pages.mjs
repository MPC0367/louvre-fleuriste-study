// Builds the static demo for GitHub Pages into out/ (npm run pages:build). Publish it with
// npm run pages:deploy. The site is served at https://mpc0367.github.io/louvre-fleuriste-study/.
//
// - Next.js static export (next.config.mjs, LF_STATIC=1) under the repository's sub-path.
// - Orders, the confirmation and the back office run in the visitor's browser (lib/demo-store.ts).
// - The API routes are for the local server; a static export cannot hold them. The export is built from
//   a copy of the project without them (.cache/pages-build), so the working tree — and a dev server
//   running on it — is never touched.
// - Every photo is pre-rendered as WebP at each width next/image asks for (lib/paths.ts IMAGE_WIDTHS).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import sharp from 'sharp';

import { BASE, SITE } from './pages-config.mjs';
// With output: 'export', Next.js 15 writes the static site into its build folder, so that folder is out/.
const OUT = 'out';
const DIST = OUT;
const WORK = '.cache/pages-build';
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

function run(cmd, args, e = process.env, cwd = undefined) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: e, cwd });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`);
}

run('node', ['scripts/photos.mjs']);
rmSync(OUT, { recursive: true, force: true });

// A copy of the project without the API routes; node_modules and public/ are linked, not copied.
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
const api = resolve('src/app/api');
cpSync('src', join(WORK, 'src'), { recursive: true, filter: (p) => resolve(p) !== api && !resolve(p).startsWith(api + sep) });
for (const file of ['next.config.mjs', 'tsconfig.json', 'package.json']) cpSync(file, join(WORK, file));
symlinkSync(resolve('node_modules'), join(WORK, 'node_modules'));
symlinkSync(resolve('public'), join(WORK, 'public'));
run('npx', ['next', 'build'], env, WORK);
renameSync(join(WORK, OUT), OUT);
rmSync(WORK, { recursive: true, force: true });
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
// Link-preview image (LINE / Facebook / X): og:image resolves to ${SITE}/og.jpg through metadataBase.
await sharp(join(src, 'DdLG95xiV-c.jpg')).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT, 'og.jpg'));
// The full-size JPEGs aren't requested by anything in the static site.
rmSync(join(OUT, 'works'), { recursive: true, force: true });

// GitHub Pages: serve folders that start with "_" (Next's _next/), and send the bare address to Thai.
writeFileSync(join(OUT, '.nojekyll'), '');
const hop = (to, title) =>
  `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${SITE}/th/"><script>location.replace(${JSON.stringify(to)} + location.search + location.hash)</script></head><body style="font-family:system-ui;background:#f4f1ec;color:#1f2f5c;padding:24px"><a href="${to}" style="color:inherit">Louvre Fleuriste</a><p style="margin-top:32px;font-size:11px;letter-spacing:.2em;text-transform:uppercase"><a href="https://o2-designstudio.com/" target="_blank" rel="noopener noreferrer" style="color:#4d5363;text-decoration:none">O2 Design Studio</a></p></body></html>\n`;
writeFileSync(join(OUT, 'index.html'), hop(`${BASE}/th/`, 'Louvre Fleuriste'));
// Unknown addresses: GitHub Pages serves 404.html. Next's own (no root layout, so not [lang]/not-found.tsx)
// has no banner, no way back and no credit; this one is bilingual and branded, with absolute links (it is
// served at any depth). The O2 mark's path is read from O2Credit.tsx so the credit keeps one source.
rmSync(join(OUT, '404'), { recursive: true, force: true });
const mark = readFileSync('src/components/O2Credit.tsx', 'utf8').match(/\sd="([^"]+)"/)[1];
const i18n = readFileSync('src/content/i18n.ts', 'utf8');
const bar = (lang) => i18n.match(new RegExp(`const ${lang} = [\\s\\S]*?bar: '([^']+)'`))?.[1] ?? i18n.match(/bar: '([^']+)'/g)[lang === 'th' ? 0 : 1].slice(6, -1);
writeFileSync(
  join(OUT, '404.html'),
  `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f4f1ec"><title>ไม่พบหน้านี้ · Page not found — Louvre Fleuriste</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:#f4f1ec;color:#151d2f;font:16px/1.6 system-ui,-apple-system,'Segoe UI',Thonburi,sans-serif}
.concept{background:#141c2e;color:#a9adb9;font-size:13px;line-height:1.5;padding:8px 16px;text-align:center}.concept p{margin:0}
main{flex:1;width:100%;max-width:880px;margin:0 auto;padding:64px 16px}
.label{margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#4d5363}
h1{margin:16px 0 32px;font:400 clamp(32px,7vw,56px)/1.2 'Iowan Old Style',Georgia,serif;color:#1f2f5c}
.links{display:flex;flex-wrap:wrap;gap:16px;margin:0}.links a{display:inline-flex;align-items:center;min-height:44px;padding:0 24px;border:1px solid #1f2f5c;color:#1f2f5c;text-decoration:none}.links a:first-child{background:#1f2f5c;color:#f4f1ec}
a:focus-visible{outline:2px solid #1f2f5c;outline-offset:3px}
footer{background:#141c2e;color:#a9adb9;padding:8px 16px}footer a:focus-visible{outline-color:#efeae2}
.o2-credit{display:inline-flex;align-items:center;min-height:44px;color:inherit;text-decoration:none;font-size:.6875rem;line-height:1;letter-spacing:.2em;text-transform:uppercase}.o2-credit:hover,.o2-credit:focus-visible{color:#efeae2}.o2-credit__lockup{white-space:nowrap}.o2-credit__mark{display:inline-block;width:1.95em;height:1.6em;margin-right:.5em;vertical-align:-.366em}
</style></head><body>
<aside class="concept" aria-label="ตัวอย่าง · Sample"><p>${bar('th')}</p><p lang="en">${bar('en')}</p></aside>
<main><p class="label">404</p><h1>ไม่พบหน้านี้ <span lang="en">· Page not found</span></h1><p class="links"><a href="${BASE}/th/">หน้าแรก</a><a href="${BASE}/en/" lang="en">Home</a></p></main>
<footer><a class="o2-credit" href="https://o2-designstudio.com/" target="_blank" rel="noopener noreferrer" lang="en" aria-label="Website by O2 Design Studio (opens in a new tab)"><span class="o2-credit__lockup"><svg class="o2-credit__mark" viewBox="0 0 158.1 129.7" aria-hidden="true" focusable="false"><path fill="currentColor" d="${mark}"/></svg>Design Studio</span></a></footer>
</body></html>
`,
);

const size = (d) => readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? size(join(d, e.name)) : statSync(join(d, e.name)).size), 0);
console.log(`pages: built ${OUT}/ for ${SITE}/ — ${made} photo sizes, ${(size(OUT) / 1024 / 1024).toFixed(1)} MB`);
