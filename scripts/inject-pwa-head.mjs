import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distArg = process.argv[2] ?? process.env.PWA_DIST_DIR ?? 'dist';
const distDir = path.isAbsolute(distArg) ? distArg : path.join(process.cwd(), distArg);
const indexPath = path.join(distDir, 'index.html');

const tags = [
  '<link rel="manifest" href="/manifest.json" />',
  '<meta name="theme-color" content="#D4AF37" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="Barber Studio" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<link rel="apple-touch-icon" href="/assets/icons/icon-192.png" />',
];

const html = await readFile(indexPath, 'utf8');
const missingTags = tags.filter((tag) => !html.includes(tag));

if (missingTags.length === 0) {
  process.stdout.write('[PWA] Head tags already present.\n');
  process.exit(0);
}

const injection = `\n    ${missingTags.join('\n    ')}\n`;
const nextHtml = html.replace('</head>', `${injection}</head>`);

if (nextHtml === html) {
  throw new Error(`Could not find </head> in ${indexPath}`);
}

await writeFile(indexPath, nextHtml);
process.stdout.write(`[PWA] Injected ${missingTags.length} head tag(s) into ${indexPath}.\n`);
