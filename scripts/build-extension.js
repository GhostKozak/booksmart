import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extDir = path.join(rootDir, 'extension');
const distDir = path.join(rootDir, 'dist');

function copyDirSync(src, dest, filterFn) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (filterFn && !filterFn(srcPath, entry)) continue;
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath, filterFn);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Building BookSmart Companion extensions...');

// 1. Chrome / Chromium Build
const chromeDist = path.join(distDir, 'extension-chrome');
fs.rmSync(chromeDist, { recursive: true, force: true });
copyDirSync(extDir, chromeDist, (p, entry) => entry.name !== 'manifest.firefox.json');
console.log('✓ Built Chrome extension -> dist/extension-chrome');

// 2. Firefox Build
const firefoxDist = path.join(distDir, 'extension-firefox');
fs.rmSync(firefoxDist, { recursive: true, force: true });
copyDirSync(extDir, firefoxDist, (p, entry) => entry.name !== 'manifest.firefox.json');
fs.copyFileSync(
    path.join(extDir, 'manifest.firefox.json'),
    path.join(firefoxDist, 'manifest.json')
);
console.log('✓ Built Firefox extension -> dist/extension-firefox');
