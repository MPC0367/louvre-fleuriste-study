// Finishes the lifestyle photos after AI super-resolution (scripts/superres.py, EDSR x4, run locally).
//   documents/lifestyle/originals/<name>-x4.png  ->  documents/lifestyle/NN-name.jpg
// Full frames, uncropped (the shop's corner logo stays). The peony photo (peonies-original.webp) had
// only a 3px screenshot border trimmed before upscaling.
import sharp from 'sharp';
import { join } from 'node:path';

const DIR = '../documents/lifestyle';
const jobs = [
  ['car-roses-x4.png', '01-car-roses.jpg'],
  // 02-peonies and 03-red-roses were enhanced by the studio itself (originals/*-user-enhanced.webp)
  // and are used exactly as supplied — see scripts/photos.mjs; they are not processed here.
  ['christmas-tree-x4.png', '04-christmas-tree.jpg'],
];
for (const [src, out] of jobs) {
  await sharp(join(DIR, 'originals', src))
    .resize({ width: 1800, kernel: 'lanczos3' })
    .sharpen({ sigma: 1.3, m1: 0.8, m2: 2.6 })
    .modulate({ saturation: 1.05 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(join(DIR, out));
}
console.log('lifestyle: ' + jobs.length + ' photos finished');
