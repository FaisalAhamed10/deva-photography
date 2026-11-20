// Production build:  npm run build  →  dist/
//
// The site is plain HTML/CSS/JS, so "building" means:
//   1. copy only the public files into dist/ (no scripts, uploads or source photos)
//   2. replace the https://YOUR-DOMAIN.com placeholder with the real site URL
//      (SITE_URL env var, or Netlify's automatic URL variable) in canonical/OG tags,
//      sitemap.xml and robots.txt
//   3. verify that every local file referenced by HTML, CSS, JS and the photo
//      library actually exists — the build fails if anything is missing.
// Zero dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const PUBLIC = ['index.html', 'privacy.html', 'terms.html', '404.html', 'robots.txt', 'sitemap.xml', 'site.webmanifest', 'assets'];
const PLACEHOLDER = 'https://YOUR-DOMAIN.com';
const siteUrl = (process.env.SITE_URL || process.env.URL || '').replace(/\/+$/, '');

// 1. Copy
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const item of PUBLIC) {
  const from = path.join(root, item);
  if (!fs.existsSync(from)) throw new Error(`Missing public file: ${item}`);
  fs.cpSync(from, path.join(dist, item), { recursive: true });
}

// 2. Site URL + sitemap date
const textFiles = ['index.html', 'privacy.html', 'terms.html', '404.html', 'robots.txt', 'sitemap.xml'];
const today = new Date().toISOString().slice(0, 10);
for (const f of textFiles) {
  const p = path.join(dist, f);
  let s = fs.readFileSync(p, 'utf8');
  if (siteUrl) s = s.split(PLACEHOLDER).join(siteUrl);
  if (f === 'sitemap.xml') s = s.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
  fs.writeFileSync(p, s);
}

// 3. Verify local references
const missing = [];
const check = (ref, from) => {
  if (!ref || /^(https?:|mailto:|tel:|data:|#|javascript:)/i.test(ref) || ref.includes('${')) return;
  const clean = decodeURIComponent(ref.split('#')[0].split('?')[0]);
  if (!clean) return;
  const target = clean.startsWith('/') ? path.join(dist, clean) : path.join(path.dirname(from), clean);
  if (!fs.existsSync(target)) missing.push(`${path.relative(dist, from)} → ${ref}`);
};
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = walk(dist);

for (const file of files) {
  const ext = path.extname(file);
  const s = fs.readFileSync(file, ext === '.html' || ext === '.css' || ext === '.js' || ext === '.webmanifest' ? 'utf8' : undefined);
  if (typeof s !== 'string') continue;
  if (ext === '.html') {
    for (const m of s.matchAll(/\b(?:src|href)="([^"]+)"/g)) check(m[1], file);
    for (const m of s.matchAll(/\b(?:srcset|imagesrcset)="([^"]+)"/g)) m[1].split(',').forEach((c) => check(c.trim().split(/\s+/)[0], file));
  } else if (ext === '.css') {
    for (const m of s.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) check(m[2], file);
  } else if (ext === '.webmanifest') {
    for (const m of s.matchAll(/"src":\s*"([^"]+)"/g)) check(m[1], file);
  }
}

// Photo library: every size/format listed in gallery.js must exist.
const galleryJs = fs.readFileSync(path.join(dist, 'assets/data/gallery.js'), 'utf8');
const gallery = JSON.parse(galleryJs.slice(galleryJs.indexOf('['), galleryJs.lastIndexOf(']') + 1));
for (const p of gallery) {
  for (const w of p.widths) for (const e of ['avif', 'webp']) check(`${p.src}-${w}.${e}`, path.join(dist, 'index.html'));
}

const size = files.reduce((n, f) => n + fs.statSync(f).size, 0);
if (missing.length) {
  console.error(`\n✗ Build failed — ${missing.length} missing file(s):\n  ` + missing.join('\n  '));
  process.exit(1);
}
console.log(`✓ Built dist/ — ${files.length} files, ${(size / 1048576).toFixed(1)} MB, ${gallery.length} gallery photos verified`);
console.log(siteUrl ? `✓ Site URL: ${siteUrl}` : `! No SITE_URL/URL set — canonical and social tags keep the ${PLACEHOLDER} placeholder (Netlify sets URL automatically)`);
