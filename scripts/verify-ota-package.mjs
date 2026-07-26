import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import nacl from 'tweetnacl';

const bundlePath = process.argv[2] || '.ota/android.bundle.zip';
const manifestPath = process.argv[3] || '.ota/update.json';
const signaturePath = process.argv[4] || '.ota/update.json.sig';
const manifestBytes = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const signature = Buffer.from(readFileSync(signaturePath, 'utf8').trim(), 'base64');
const publicKey = Buffer.from(readFileSync('config/ota-public-key.txt', 'utf8').trim(), 'base64');

if (!nacl.sign.detached.verify(manifestBytes, signature, publicKey)) {
  throw new Error('OTA manifest signature verification failed');
}

const actualSize = statSync(bundlePath).size;
const actualHash = createHash('sha256').update(readFileSync(bundlePath)).digest('hex');
if (manifest.size !== actualSize) throw new Error('OTA bundle size does not match the manifest');
if (manifest.sha256 !== actualHash) throw new Error('OTA bundle hash does not match the manifest');

console.log(`OTA_PACKAGE_OK channel=${manifest.channel} bundle=${manifest.bundleVersion} size=${actualSize}`);
