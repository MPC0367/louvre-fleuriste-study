// Publishes out/ (npm run pages:build) to the gh-pages branch of the public repo; GitHub Pages serves
// it at SITE. Run only when the studio says the demo should go live. The branch holds the built site
// only (force-pushed each time); the code lives on main.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { BRANCH, OWNER, REPO, SITE } from './pages-config.mjs';

const OUT = 'out';
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();

if (!existsSync(join(OUT, 'th', 'index.html')) || !existsSync(join(OUT, '.nojekyll'))) throw new Error('out/ is not a Pages build: run npm run pages:build first');

// Nothing that belongs to the studio or the shop's originals goes out: no data, documents, env files, full-size JPEGs.
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [relative(OUT, join(d, n))]));
const files = walk(OUT);
const refused = files.filter((f) => /(^|\/)(documents|\.data|\.env)|\.(sqlite|pdf|csv|jpe?g|png|heic)$/i.test(f));
if (refused.length) throw new Error(`refusing to publish:\n${refused.slice(0, 20).join('\n')}`);

const vis = sh('gh', ['repo', 'view', `${OWNER}/${REPO}`, '--json', 'visibility', '-q', '.visibility']);
if (vis !== 'PUBLIC') throw new Error(`${OWNER}/${REPO} is ${vis}; Pages needs it public`);
const url = `https://github.com/${OWNER}/${REPO}.git`;
const main = sh('git', ['rev-parse', '--short', 'HEAD']);
const dirty = sh('git', ['status', '--porcelain']) ? ' (with uncommitted changes)' : '';

const tmp = mkdtempSync(join(tmpdir(), 'lf-pages-'));
try {
  cpSync(OUT, tmp, { recursive: true });
  const g = (...a) => sh('git', a, { cwd: tmp });
  g('init', '-q', '-b', BRANCH);
  g('add', '-A');
  g('commit', '-q', '-m', `Deploy the static demo from main ${main}${dirty}`);
  g('push', '-q', '--force', url, BRANCH);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// Turn Pages on the first time (serving the gh-pages branch root).
let pages = null;
try {
  pages = JSON.parse(sh('gh', ['api', `repos/${OWNER}/${REPO}/pages`]));
} catch {
  pages = JSON.parse(sh('gh', ['api', '-X', 'POST', `repos/${OWNER}/${REPO}/pages`, '-f', `source[branch]=${BRANCH}`, '-f', 'source[path]=/']));
}
console.log(`deployed ${files.length} files from main ${main} → ${BRANCH}; Pages: ${pages?.html_url ?? SITE} (status: ${pages?.status ?? 'building'})`);
