// Add new photos to the site in one step.
//
//   1. Put original photos in a category folder:
//        uploads/wedding/   uploads/fashion/   uploads/portraits/   uploads/baby/
//   2. Run:  npm run add-photos
//
// Each photo is resized to 480 / 960 / 1440 px in AVIF + WebP, added to
// assets/data/gallery.js with today's date, and moved to uploads/_done/.
// Because the footer "Latest Photos" shows the 9 newest gallery entries,
// new photos appear there (and in the gallery) automatically.
// Afterwards, open assets/data/gallery.js and improve the "title" and "alt" text.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploads = path.join(root, 'uploads');
const outDir = path.join(root, 'assets/images/gallery');
const dataFile = path.join(root, 'assets/data/gallery.js');
const CATEGORIES = ['wedding', 'fashion', 'portraits', 'baby'];
const LABEL = { wedding: 'Wedding', fashion: 'Fashion', portraits: 'Portrait', baby: 'Baby shoot' };
const WIDTHS = [480, 960, 1440];
const EXT = /\.(jpe?g|png|webp|tiff?|heic|avif)$/i;

const src = fs.readFileSync(dataFile, 'utf8');
const start = src.indexOf('[', src.indexOf('window.DEVA_GALLERY'));
const end = src.lastIndexOf(']');
const header = src.slice(0, start);
const gallery = JSON.parse(src.slice(start, end + 1));
const ids = new Set(gallery.map((p) => p.id));

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 40) || 'photo';
const localISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
const titleCase = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

let added = 0;
for (const cat of CATEGORIES) {
  const dir = path.join(uploads, cat);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir).filter((f) => EXT.test(f)).sort()) {
    const file = path.join(dir, name);
    const base = path.parse(name).name;
    let id = slug(base);
    for (let n = 2; ids.has(id); n++) id = `${slug(base)}-${n}`;
    ids.add(id);

    const img = sharp(file, { failOn: 'none' }).rotate(); // respect camera orientation
    const meta = await img.metadata();
    const portrait = (meta.orientation || 1) >= 5;
    const width = portrait ? meta.height : meta.width;
    const height = portrait ? meta.width : meta.height;
    const widths = [...new Set(WIDTHS.map((w) => Math.min(w, width)))];

    for (const w of widths) {
      const resized = img.clone().resize({ width: w, withoutEnlargement: true });
      await resized.clone().webp({ quality: 80, effort: 5 }).toFile(path.join(outDir, `${id}-${w}.webp`));
      await resized.clone().avif({ quality: 55, effort: 4 }).toFile(path.join(outDir, `${id}-${w}.avif`));
    }
    const { dominant } = await img.clone().stats();
    const dark = (v) => Math.round(v * 0.55).toString(16).padStart(2, '0');
    const finalW = widths[widths.length - 1];

    gallery.push({
      id,
      src: `assets/images/gallery/${id}`,
      widths,
      width: finalW,
      height: Math.round((height * finalW) / width),
      color: `#${dark(dominant.r)}${dark(dominant.g)}${dark(dominant.b)}`,
      categories: [cat],
      title: titleCase(base),
      alt: `${LABEL[cat]} photograph by DEVA Photography`, // EDIT: describe the photo
      focal: '50% 40%',
      date: localISO(new Date(Date.now() + added * 1000)),
      source: ''
    });

    const done = path.join(uploads, '_done', cat);
    fs.mkdirSync(done, { recursive: true });
    fs.renameSync(file, path.join(done, name));
    console.log(`✓ ${cat}/${name} → ${id}`);
    added++;
  }
}

if (!added) {
  console.log('No new photos found. Put images in uploads/<wedding|fashion|portraits|baby>/ and run again.');
} else {
  fs.writeFileSync(dataFile, header + JSON.stringify(gallery, null, 2) + ';\n');
  console.log(`\nAdded ${added} photo(s). Gallery and footer "Latest Photos" now include them.`);
  console.log('Tip: edit "title" and "alt" for each new entry in assets/data/gallery.js.');
}
