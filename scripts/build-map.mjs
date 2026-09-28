// Turns an OpenStreetMap extract (.cache/osm-sathon.json, Overpass) into a compact SVG map
// (src/content/map/sathon.json) drawn in the site's palette. Data © OpenStreetMap contributors, ODbL.
import { readFileSync, writeFileSync } from 'node:fs';

const PIN = { lat: 13.711737, lng: 100.5349339 }; // Google-listed studio (unconfirmed vs the Instagram bio)
const osm = JSON.parse(readFileSync('.cache/osm-sathon.json', 'utf8'));
const M = 111320;
const kx = M * Math.cos((PIN.lat * Math.PI) / 180);
const W = 1600, H = 1400; // metres shown
const proj = (p) => [Math.round((p.lon - PIN.lng) * kx + W / 2), Math.round(H / 2 - (p.lat - PIN.lat) * M)];

function simplify(pts, tol = 3) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [px, py] = out[out.length - 1];
    if (Math.hypot(x - px, y - py) >= tol) out.push(pts[i]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const d = (pts, close) => 'M' + pts.map((p) => p.join(' ')).join('L') + (close ? 'Z' : '');

const groups = { motorway: [], major: [], minor: [], service: [], rail: [], water: [], park: [] };
const labelled = new Map();
for (const e of osm.elements) {
  if (!e.geometry) continue;
  const t = e.tags;
  const pts = simplify(e.geometry.map(proj));
  let g = null;
  if (t.highway === 'motorway') g = 'motorway';
  else if (['trunk', 'primary', 'secondary'].includes(t.highway)) g = 'major';
  else if (['tertiary', 'unclassified', 'residential', 'living_street'].includes(t.highway)) g = 'minor';
  else if (t.highway === 'service') g = 'service';
  else if (t.railway) g = 'rail';
  else if (t.waterway) g = 'water';
  else if (t.leisure === 'park') g = 'park';
  if (!g) continue;
  groups[g].push(d(pts, g === 'park'));
  if ((g === 'major' || (g === 'minor' && t.highway === 'tertiary') || g === 'water') && t.name && t['name:en']) {
    const len = pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
    const prev = labelled.get(t.name);
    if (!prev || prev.len < len) labelled.set(t.name, { len, pts, th: t.name, en: t['name:en'], kind: g });
  }
}
const labels = [...labelled.values()]
  .filter((l) => l.len > 250)
  .map((l) => {
    // Label at the middle segment, angle kept readable.
    const mid = Math.floor(l.pts.length / 2);
    const a = l.pts[Math.max(0, mid - 1)], b = l.pts[Math.min(l.pts.length - 1, mid)];
    let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    if (ang > 90) ang -= 180;
    if (ang < -90) ang += 180;
    return { x: Math.round((a[0] + b[0]) / 2), y: Math.round((a[1] + b[1]) / 2), a: Math.round(ang), th: l.th, en: l.en.replace(/ Road$/, ' Rd'), kind: l.kind };
  });
const out = { w: W, h: H, pin: [W / 2, H / 2], paths: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.join('')])), labels, attribution: '© OpenStreetMap contributors' };
writeFileSync('src/content/map/sathon.json', JSON.stringify(out));
console.log('map:', Object.fromEntries(Object.entries(out.paths).map(([k, v]) => [k, v.length])), 'labels', labels.length, (JSON.stringify(out).length / 1024).toFixed(0) + ' KB');
