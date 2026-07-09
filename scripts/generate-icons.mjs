import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const source = sharp(resolve(root, 'public/guru-cibisd2.png'));

const metadata = await source.metadata();
console.log(`Source logo: ${metadata.width}x${metadata.height}`);

await source.resize(192, 192).png().toFile(resolve(root, 'public/icon-192.png'));
await source.resize(512, 512).png().toFile(resolve(root, 'public/icon-512.png'));
await source.resize(180, 180).png().toFile(resolve(root, 'public/apple-touch-icon.png'));

const resized = await source.resize(320, 320).png().toBuffer();

await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 13, g: 122, b: 138, alpha: 1 },
  },
})
  .composite([{ input: resized, left: 96, top: 96 }])
  .png()
  .toFile(resolve(root, 'public/maskable-512.png'));

console.log('PWA icons regenerated from guru-cibisd2.png.');
