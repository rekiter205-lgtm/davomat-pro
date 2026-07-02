/**
 * Download face-api.js model weights into /public/models.
 * Run with: npx tsx scripts/download-models.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const MODELS_DIR = path.join(process.cwd(), 'public', 'models');
const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // follow redirect
        download(res.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

  console.log(`📥  Downloading face-api.js models to ${MODELS_DIR}\n`);
  for (const f of FILES) {
    const dest = path.join(MODELS_DIR, f);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`   ⤷  ${f}  (already exists, skipping)`);
      continue;
    }
    process.stdout.write(`   ⤷  ${f}  ...`);
    await download(`${BASE}/${f}`, dest);
    console.log(' ✓');
  }
  console.log('\n✅  Models downloaded successfully.');
}

main().catch((e) => {
  console.error('❌  Download failed:', e);
  process.exit(1);
});
