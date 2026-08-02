import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const svgPath = path.join(publicDir, 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Standard PWA & Web Icon Sizes
const sizes = [
  { name: 'favicon-16x16.png', size: 16, dest: 'root' },
  { name: 'favicon-32x32.png', size: 32, dest: 'root' },
  { name: 'apple-touch-icon.png', size: 180, dest: 'root' },
  { name: 'apple-touch-icon-152x152.png', size: 152, dest: 'icons' },
  { name: 'apple-touch-icon-167x167.png', size: 167, dest: 'icons' },
  { name: 'apple-touch-icon-180x180.png', size: 180, dest: 'icons' },
  { name: 'icon-72x72.png', size: 72, dest: 'icons' },
  { name: 'icon-96x96.png', size: 96, dest: 'icons' },
  { name: 'icon-128x128.png', size: 128, dest: 'icons' },
  { name: 'icon-144x144.png', size: 144, dest: 'icons' },
  { name: 'icon-192x192.png', size: 192, dest: 'icons' },
  { name: 'icon-192x192.png', size: 192, dest: 'root' },
  { name: 'icon-384x384.png', size: 384, dest: 'icons' },
  { name: 'icon-512x512.png', size: 512, dest: 'icons' },
  { name: 'icon-512x512.png', size: 512, dest: 'root' }
];

async function generateIcons() {
  console.log('Generating high-resolution PWA and mobile icons...');
  
  for (const item of sizes) {
    const targetDir = item.dest === 'root' ? publicDir : iconsDir;
    const outputPath = path.join(targetDir, item.name);
    await sharp(svgBuffer)
      .resize(item.size, item.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile(outputPath);
    console.log(`Generated: ${item.dest}/${item.name} (${item.size}x${item.size})`);
  }

  // Generate 512x512 Maskable Icon for Android Adaptive Icons (with safe zone margin)
  const maskablePath = path.join(iconsDir, 'maskable-icon-512x512.png');
  const innerSize = 410; // 80% safe area for Android adaptive icons
  const padding = Math.floor((512 - innerSize) / 2);
  
  const innerIconBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 240, g: 249, b: 255, alpha: 1 } // #f0f9ff light blue theme background
    }
  })
    .composite([
      {
        input: innerIconBuffer,
        top: padding,
        left: padding
      }
    ])
    .png({ quality: 100 })
    .toFile(maskablePath);

  console.log('Generated: icons/maskable-icon-512x512.png (512x512 - Adaptive Android Safe Zone)');

  // Also copy 32x32 to favicon.ico in root
  const favicon32Path = path.join(publicDir, 'favicon-32x32.png');
  const faviconIcoPath = path.join(publicDir, 'favicon.ico');
  fs.copyFileSync(favicon32Path, faviconIcoPath);
  console.log('Generated: /favicon.ico');

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
