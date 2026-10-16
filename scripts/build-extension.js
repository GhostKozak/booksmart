import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extDir = path.join(rootDir, 'extension');
const distDir = path.join(rootDir, 'dist');
const publicDownloadsDir = path.join(rootDir, 'public', 'downloads');
const rootDownloadsDir = path.join(rootDir, 'downloads');

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

function createZip(sourceDir, outputFile) {
    const files = [];
    function scan(dir, base = '') {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const relPath = base ? `${base}/${entry.name}` : entry.name;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                scan(fullPath, relPath);
            } else if (entry.isFile()) {
                files.push({ relPath, fullPath });
            }
        }
    }
    scan(sourceDir);

    const localHeaders = [];
    const centralEntries = [];
    let offset = 0;

    for (const f of files) {
        const data = fs.readFileSync(f.fullPath);
        const crc = zlib.crc32(data);
        const compressed = zlib.deflateRawSync(data);
        const useCompressed = compressed.length < data.length;
        const compData = useCompressed ? compressed : data;
        const compMethod = useCompressed ? 8 : 0;
        const nameBuf = Buffer.from(f.relPath.replace(/\\/g, '/'), 'utf8');

        // Local header (30 bytes)
        const lh = Buffer.alloc(30 + nameBuf.length);
        lh.writeUInt32LE(0x04034b50, 0); // signature
        lh.writeUInt16LE(20, 4);         // version needed (2.0)
        lh.writeUInt16LE(0, 6);          // flags
        lh.writeUInt16LE(compMethod, 8); // compression method
        lh.writeUInt16LE(0, 10);         // time
        lh.writeUInt16LE(0, 12);         // date
        lh.writeUInt32LE(crc, 14);       // crc32
        lh.writeUInt32LE(compData.length, 18); // comp size
        lh.writeUInt32LE(data.length, 22);     // uncomp size
        lh.writeUInt16LE(nameBuf.length, 26);  // name length
        lh.writeUInt16LE(0, 28);         // extra length
        nameBuf.copy(lh, 30);

        localHeaders.push(lh, compData);

        // Central directory header (46 bytes)
        const ch = Buffer.alloc(46 + nameBuf.length);
        ch.writeUInt32LE(0x02014b50, 0); // signature
        ch.writeUInt16LE(20, 4);         // version made by
        ch.writeUInt16LE(20, 6);         // version needed
        ch.writeUInt16LE(0, 8);          // flags
        ch.writeUInt16LE(compMethod, 10);
        ch.writeUInt16LE(0, 12);         // time
        ch.writeUInt16LE(0, 14);         // date
        ch.writeUInt32LE(crc, 16);
        ch.writeUInt32LE(compData.length, 20);
        ch.writeUInt32LE(data.length, 24);
        ch.writeUInt16LE(nameBuf.length, 28);
        ch.writeUInt16LE(0, 30);         // extra length
        ch.writeUInt16LE(0, 32);         // comment length
        ch.writeUInt16LE(0, 34);         // disk start
        ch.writeUInt16LE(0, 36);         // internal attrs
        ch.writeUInt32LE(0, 38);         // external attrs
        ch.writeUInt32LE(offset, 42);    // relative offset of local header
        nameBuf.copy(ch, 46);

        centralEntries.push(ch);
        offset += lh.length + compData.length;
    }

    const cdBuf = Buffer.concat(centralEntries);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);   // EOCD signature
    eocd.writeUInt16LE(0, 4);            // disk number
    eocd.writeUInt16LE(0, 6);            // cd start disk
    eocd.writeUInt16LE(files.length, 8); // total records on disk
    eocd.writeUInt16LE(files.length, 10);// total records
    eocd.writeUInt32LE(cdBuf.length, 12);// cd size
    eocd.writeUInt32LE(offset, 16);      // cd offset
    eocd.writeUInt16LE(0, 20);           // comment length

    const finalBuf = Buffer.concat([...localHeaders, cdBuf, eocd]);
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, finalBuf);
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

// 3. Root Firefox directory (ready for immediate unpacked testing in Firefox without running build)
const extFirefoxDir = path.join(rootDir, 'extension-firefox');
fs.rmSync(extFirefoxDir, { recursive: true, force: true });
copyDirSync(extDir, extFirefoxDir, (p, entry) => entry.name !== 'manifest.firefox.json');
fs.copyFileSync(
    path.join(extDir, 'manifest.firefox.json'),
    path.join(extFirefoxDir, 'manifest.json')
);
console.log('✓ Synced Firefox extension folder -> extension-firefox');

// 4. Archive Extension ZIPs (for downloads in README, GitHub releases & App)
const chromeZipPublic = path.join(publicDownloadsDir, 'booksmart-companion-chrome.zip');
const chromeZipRoot = path.join(rootDownloadsDir, 'booksmart-companion-chrome.zip');
createZip(chromeDist, chromeZipPublic);
fs.mkdirSync(rootDownloadsDir, { recursive: true });
fs.copyFileSync(chromeZipPublic, chromeZipRoot);
console.log('✓ Created Chrome extension zip -> public/downloads & downloads/');

const firefoxZipPublic = path.join(publicDownloadsDir, 'booksmart-companion-firefox.zip');
const firefoxZipRoot = path.join(rootDownloadsDir, 'booksmart-companion-firefox.zip');
createZip(firefoxDist, firefoxZipPublic);
fs.copyFileSync(firefoxZipPublic, firefoxZipRoot);
console.log('✓ Created Firefox extension zip -> public/downloads & downloads/');
