/**
 * Builds a single self-contained HTML snapshot of the whole study — site and admin, Thai and English —
 * at snapshot/louvre-fleuriste.html (git-ignored: it embeds the shop's photographs).
 *
 *   npm run snapshot:build        production build into .next-build
 *   (start the `louvre-snapshot` preview, or: npm run snapshot:serve)   → :4411, own sample database
 *   npm run snapshot
 *
 * Every page is captured server-rendered after the browser has run it, then packed (gzip, base64) with
 * the stylesheets, fonts and photographs inlined. A small runtime routes between pages by #path and
 * re-creates the few interactions (menu, lightbox steps, order steps). Anything that would act on the
 * world — calls, saving admin changes, uploads, exports — shows a note instead.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const BASE = (process.env.SNAPSHOT_BASE ?? 'http://127.0.0.1:4411').replace(/\/$/, '');
const OUT = path.resolve('snapshot/louvre-fleuriste.html');
const OUT_ARTIFACT = path.resolve('snapshot/artifact/louvre-fleuriste-study.html');
const LANGS = ['th', 'en'];
const FLOW_WORK = 'Dcc0QsXgRFW';
const WORKS = ['DdLG95xiV-c', 'Dcc0QsXgRFW', 'Db7cIc-jgC7', 'Db2W2BqgXbk', 'DbIKVRSgVKW', 'Da2GRv_geDn', 'DZogaHrAYa5', 'DZWpv9iATQ4', 'DYtVo3ZgduE', 'DX85V6FgVzg', 'DXd1mNPgZii', 'DWs8CidAUfz'];
const COLOURS = ['white', 'pink', 'peach', 'lavender', 'blue', 'yellow', 'red'];
const OCCASIONS = ['valentines', 'mothers-day', 'christmas'];
const KINDS = ['bouquet', 'box', 'vase'];
const EXTRA = JSON.parse(await fs.readFile(new URL('../src/content/extra-works.json', import.meta.url), 'utf8')).map((x) => x.id);
const DRAWERS = ['LF-S00015', 'LF-S00005', 'LF-S00008', 'LF-S00011'];

const UI = {
  th: {
    call: 'การโทรปิดไว้ในตัวอย่างนี้ เบอร์นี้เป็นเบอร์จริงของร้าน',
    missing: 'หน้านี้ไม่อยู่ในตัวอย่างนี้',
    save: 'ตัวอย่างนี้ไม่บันทึกการเปลี่ยนแปลง',
    date: 'ตัวอย่างนี้แสดงวันเดียวที่เลือกไว้',
    upload: 'การอัปโหลดปิดไว้ในตัวอย่างนี้',
    export: 'การดาวน์โหลดปิดไว้ในตัวอย่างนี้',
    order: 'ตัวอย่างนี้พาไปดูการสั่งช่อไฮเดรนเยียฟ้าเป็นตัวอย่าง',
  },
  en: {
    call: 'Calls are switched off in this preview — that is the shop’s real number.',
    missing: 'That page isn’t part of this preview.',
    save: 'Changes aren’t saved in this preview.',
    date: 'This preview walks through one chosen date.',
    upload: 'Uploads are switched off in this preview.',
    export: 'Downloads are switched off in this preview.',
    order: 'This preview walks through ordering the light blue hydrangea as an example.',
  },
};

const pages = {};
const images = {};
let htmlClass = '';
let loaderHtml = '';

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'th-TH' });
  const page = await ctx.newPage();
  const api = ctx.request;

  const avail = await (await api.get(`${BASE}/api/availability?days=21`)).json();
  const day = avail.days.find((d) => (d.state === 'open' || d.state === 'peak') && d.windows.find((w) => w.id === 'pm' && w.left > 0));
  if (!day) throw new Error('no open day for the sample order');

  for (const l of LANGS) {
    const flow = `/${l}/order?work=${FLOW_WORK}`;
    const simple = [`/${l}`, `/${l}/works`, `/${l}/instagram`, `/${l}/contact`];
    for (const p of simple) await capture(page, p);
    for (const c of COLOURS) await capture(page, `/${l}/works?colour=${c}`);
    for (const o of OCCASIONS) await capture(page, `/${l}/works?occasion=${o}`);
    for (const k of KINDS) await capture(page, `/${l}/works?kind=${k}`);
    for (const w of [...WORKS, ...EXTRA]) await capture(page, `/${l}/works/${w}`);
    for (const w of WORKS) await capture(page, `/${l}/instagram?post=${w}`, { wait: 'dialog[open] img' });

    // The order flow: a blank start, then one worked example through every step.
    await page.goto(BASE + `/${l}`);
    await page.evaluate(() => localStorage.clear());
    await capture(page, `/${l}/order`, { wait: '.stephead' });
    const draft = sampleDraft(l, day.date);
    await page.evaluate((d) => localStorage.setItem('lf-order-draft-v1', JSON.stringify(d)), draft);
    await capture(page, flow, { wait: '.stephead' });
    for (let s = 1; s <= 4; s++) await capture(page, `${flow}&step=${s}`, { wait: s === 2 ? '.cal__day[aria-selected="true"]' : '.stephead' });

    // Place the example order for real (in the snapshot's own database) and capture its confirmation.
    const res = await page.evaluate(async (d) => {
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, idemKey: d.idemKey }) });
      return r.json();
    }, { ...draft, lang: l, recipientName: draft.recipientName });
    if (!res.ref) throw new Error('sample order failed: ' + JSON.stringify(res));
    await capture(page, `/${l}/order/${res.ref}?t=${encodeURIComponent(res.token)}`, { key: `/${l}/order/confirmation` });

    // Admin — the order just placed arrives at the top of "awaiting confirmation".
    const today = avail.today;
    for (const q of ['', '?status=new', '?range=past', '?status=all', `?date=${today}`]) await capture(page, `/${l}/admin${q}`);
    for (const ref of [res.ref, ...DRAWERS]) await capture(page, `/${l}/admin?order=${ref}`);
    await capture(page, `/${l}/admin/capacity`);
    await capture(page, `/${l}/admin/settings`);
  }

  // Stylesheets, with every font inlined.
  const cssHrefs = await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')));
  let css = '';
  for (const h of cssHrefs) css += (await (await api.get(BASE + h)).text()) + '\n';
  const fontUrls = [...new Set([...css.matchAll(/url\((\/_next\/static\/media\/[^)]+)\)/g)].map((m) => m[1]))];
  for (const u of fontUrls) {
    const b = Buffer.from(await (await api.get(BASE + u)).body());
    css = css.split(`url(${u})`).join(`url(data:font/woff2;base64,${b.toString('base64')})`);
  }

  // Photographs: one AVIF per key (compact enough to embed ~100 photos at retina sizes).
  //   lifestyle + shopfront 1080px, Instagram photos 1080px, grid photos their full ~712px.
  for (const key of Object.keys(images)) {
    const big = /^works\/(l-|shop-front)/.test(key);
    const ig = /^works\/[A-Za-z0-9_-]{11}$/.test(key) || /^works\/x-(studio-|grid-[89])/.test(key);
    const w = big || ig ? 1080 : 828;
    const q = big ? 82 : 72;
    const src = key.startsWith('works/') ? `/_next/image?url=${encodeURIComponent('/' + key + '.jpg')}&w=${w}&q=${q}` : `/api/admin/uploads/${key.slice(7)}`;
    const r = await api.get(BASE + src, { headers: { Accept: 'image/avif,image/webp,*/*' } });
    const type = r.headers()['content-type'];
    images[key] = `data:${type};base64,${Buffer.from(await r.body()).toString('base64')}`;
  }
  await browser.close();

  const packed = gzipSync(Buffer.from(JSON.stringify(pages))).toString('base64');
  const enhanceSrc = (await fs.readFile(new URL('../src/lib/enhance.js', import.meta.url), 'utf8')).replace('export function enhance', 'function enhance');
  const runtime = enhanceSrc + '\n' + (await fs.readFile(new URL('./snapshot-runtime.js', import.meta.url), 'utf8'));
  const cfg = { home: '/th', ui: UI, flowWork: FLOW_WORK, works: WORKS, htmlClass };
  const html = `<!doctype html>
<!-- Louvre Fleuriste — unsolicited design study by O2 Design Studio. Not the shop's website. Photographs belong to Louvre Fleuriste. Nothing here orders, calls or saves. -->
<html lang="th" class="${htmlClass} js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, noimageindex">
<title>Louvre Fleuriste — design study</title>
<style>${css}</style>
<style>
.lf-toast{position:fixed;left:50%;bottom:calc(128px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:200;max-width:min(92vw,520px);background:#141c2e;color:#efeae2;padding:12px 18px;border-radius:2px;font:14px/1.5 var(--f-body);box-shadow:0 16px 40px -16px rgba(0,0,0,.5)}
.lf-toast[hidden]{display:none}
.lf-switch{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom));z-index:150;display:flex;padding:4px;gap:2px;background:#141c2e;border-radius:999px;box-shadow:0 12px 32px -12px rgba(0,0,0,.5);font:500 13px/1 var(--f-body)}
.lf-switch a{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:999px;color:#a9adb9;text-decoration:none}
.lf-switch a[aria-current="true"]{background:#efeae2;color:#141c2e}
body.lf-modal .lf-switch{display:none}
@media (max-width:899px){.lf-switch{bottom:calc(72px + env(safe-area-inset-bottom))}}

</style>
</head>
<body>
${loaderHtml.replace('class="loader"', 'id="lf-loader" class="loader"')}
<div id="lf-app"></div>
<div class="lf-toast" role="status" aria-live="polite" hidden></div>
<nav class="lf-switch" aria-label="Preview"><a href="#/th" data-lf-switch="site">Website</a><a href="#/th/admin" data-lf-switch="admin">Back office</a></nav>
<script type="application/json" id="lf-cfg">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>
<script type="application/json" id="lf-img">${JSON.stringify(images)}</script>
<script type="text/plain" id="lf-pages">${packed}</script>
<script>${runtime}</script>
</body>
</html>`;
  await fs.mkdir(path.dirname(OUT_ARTIFACT), { recursive: true });
  await fs.writeFile(OUT, html);
  // The Artifact host wraps the page in its own doctype/head/body: publish the inside only.
  const inner = html
    .replace(/^<!doctype html>\n/, '')
    .replace(/<html[^>]*>\n<head>\n/, '')
    .replace(/<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n/, '')
    .replace('<title>Louvre Fleuriste — design study</title>', '<title>Louvre Fleuriste Design Study</title>')
    .replace('</head>\n<body>\n', '')
    .replace(/<\/body>\n<\/html>$/, '');
  await fs.writeFile(OUT_ARTIFACT, inner);
  const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
  console.log(`snapshot: ${Object.keys(pages).length} pages, ${Object.keys(images).length} images, ${fontUrls.length} font files → ${OUT} (${mb} MB)`);
}

async function capture(page, url, { key = url, wait } = {}) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  if (wait) await page.waitForSelector(wait, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const imgs = [];
    document.querySelectorAll('script, next-route-announcer, nextjs-portal, template').forEach((e) => e.remove());
    // A photo caught in its fallback state gets its image back: the snapshot embeds every photo.
    document.querySelectorAll('.photo--fallback[data-work]').forEach((p) => {
      p.classList.remove('photo--fallback');
      const img = document.createElement('img');
      img.src = '/works/' + p.getAttribute('data-work') + '.jpg';
      img.alt = '';
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
      p.appendChild(img);
    });
    // Other sites can't be embedded in the artifact: swap the Google map for the drawn one.
    document.querySelectorAll('[data-lf-gmap]').forEach((f) => {
      const m = f.closest('.mapblock')?.querySelector('[data-svgmap]');
      (f.closest('.mapblock__frame') ?? f).remove();
      if (m) m.hidden = false;
    });
    // The carousel starts from its first slide, whatever moment it was captured in.
    document.querySelectorAll('[data-carousel]').forEach((c) => {
      c.querySelectorAll('[data-slide]').forEach((x, k) => x.classList.toggle('is-on', k === 0));
      c.querySelectorAll('[data-cap]').forEach((x, k) => (x.hidden = k !== 0));
    });
    const loader = document.querySelector('.loader');
    const loaderHtml = loader ? loader.outerHTML : '';
    loader?.remove();
    document.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      let k = null;
      const m = src.match(/url=%2Fworks%2F([^&%.]+)\.jpg/) || src.match(/^\/works\/([^.]+)\.jpg/);
      if (m) k = 'works/' + m[1];
      const u = src.match(/\/api\/admin\/uploads\/([a-f0-9]{24})/);
      if (u) k = 'upload/' + u[1];
      if (src.startsWith('data:') || src.startsWith('blob:')) return;
      if (k) {
        img.setAttribute('data-lf-img', k);
        imgs.push(k);
      }
      img.removeAttribute('src');
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.removeAttribute('loading');
    });
    document.querySelectorAll('a[href]').forEach((a) => {
      const h = a.getAttribute('href');
      if (h.startsWith('/')) {
        a.setAttribute('href', '#' + h);
        a.removeAttribute('target');
      }
    });
    document.querySelectorAll('form').forEach((f) => f.setAttribute('data-lf-form', ''));
    return { lang: document.documentElement.lang, title: document.title, html: document.body.innerHTML, cls: document.documentElement.className.replace(/\bjs\b/, '').trim(), imgs, loaderHtml };
  });
  htmlClass = r.cls;
  if (r.loaderHtml) loaderHtml = r.loaderHtml.replace('data-on="false"', 'data-on="true"');
  r.imgs.forEach((k) => (images[k] ??= ''));
  pages[key] = { lang: r.lang, title: r.title, html: r.html };
  process.stdout.write('.');
}

function sampleDraft(l, date) {
  const th = l === 'th';
  return {
    kind: 'bouquet', workId: FLOW_WORK, similar: false, budget: 3500, budgetOther: '', occasion: 'mothers-day', occasionOther: '', colour: 'blue',
    flowers: th ? 'ขอโทนฟ้ากับขาว ไม่เอาลิลลี่' : 'Blue and white please, no lilies', uploadId: null, uploadName: '', uploadThumb: null,
    date, windowId: 'pm', method: 'delivery', recipientName: th ? 'คุณแม่' : 'Mum', recipientPhone: '0800000998',
    address: th ? 'ที่อยู่ตัวอย่าง 12/3 ซอยตัวอย่าง' : '12/3 Sample Soi, Sample Road', subdistrict: th ? 'พระโขนงเหนือ' : 'Phra Khanong Nuea',
    district: th ? 'วัฒนา' : 'Watthana', province: th ? 'กรุงเทพมหานคร' : 'Bangkok', postcode: '10110', instructions: '',
    card: th ? 'รักแม่ที่สุด ขอบคุณสำหรับทุกอย่าง' : 'For Mum — thank you for everything.',
    senderName: th ? 'ลูกค้าตัวอย่าง' : 'Sample Customer', senderPhone: '0800000999', email: '', notes: '', sameAsYou: false,
    idemKey: `snapshot${l}${date.replace(/-/g, '')}0000000`,
  };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
