import { createHash, createPrivateKey, sign } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const bundlePath = required(args, 'bundle');
const outputDir = resolve(required(args, 'output'));
const channel = required(args, 'channel');
const bundleVersion = Number(required(args, 'bundle-version'));
const downloadUrl = required(args, 'download-url');
const privateKeyBase64 =
  process.env.OTA_SIGNING_PRIVATE_KEY?.trim() ||
  readLocalSigningKey();
const appVersion = JSON.parse(readFileSync(resolve('app.json'), 'utf8')).expo.version;

if (!['development', 'production'].includes(channel)) {
  throw new Error('channel must be development or production');
}
if (!Number.isSafeInteger(bundleVersion) || bundleVersion <= 0) {
  throw new Error('bundle-version must be a positive integer');
}
if (!privateKeyBase64) throw new Error('OTA_SIGNING_PRIVATE_KEY is required');
if (!downloadUrl.startsWith('https://github.com/')) {
  throw new Error('download-url must use a GitHub HTTPS release URL');
}

const bundleBytes = readFileSync(resolve(bundlePath));
const size = statSync(resolve(bundlePath)).size;
const sha256 = createHash('sha256').update(bundleBytes).digest('hex');
const releaseNotes = (process.env.OTA_RELEASE_NOTES || 'Performance and reliability improvements.')
  .split(/\r?\n/)
  .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
  .filter(Boolean)
  .slice(0, 12);

const manifest = {
  schemaVersion: 1,
  id: `ota-${channel}-${appVersion}-${bundleVersion}`,
  channel,
  platform: 'android',
  targetAppVersion: appVersion,
  bundleVersion,
  downloadUrl,
  sha256,
  size,
  mandatory: process.env.OTA_MANDATORY === 'true',
  publishedAt: new Date().toISOString(),
  releaseNotes,
};

const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
const privateKey = createPrivateKey({
  key: Buffer.from(privateKeyBase64, 'base64'),
  format: 'der',
  type: 'pkcs8',
});
const signature = sign(null, Buffer.from(manifestText, 'utf8'), privateKey).toString('base64');

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, 'update.json'), manifestText);
writeFileSync(resolve(outputDir, 'update.json.sig'), `${signature}\n`);
writeFileSync(resolve(outputDir, 'android.bundle.zip.sha256'), `${sha256}  android.bundle.zip\n`);

console.log(`Created signed ${channel} OTA manifest for app ${appVersion}, bundle ${bundleVersion}.`);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]?.replace(/^--/, '');
    const value = values[index + 1];
    if (!key || value === undefined) throw new Error(`Invalid argument near ${values[index] ?? 'end'}`);
    parsed[key] = value;
  }
  return parsed;
}

function required(values, key) {
  const value = values[key];
  if (!value) throw new Error(`--${key} is required`);
  return value;
}

function readLocalSigningKey() {
  if (process.env.CI) return undefined;
  try {
    return readFileSync(resolve('.secrets', 'ota-private-key.pk8.base64'), 'utf8').trim();
  } catch {
    return undefined;
  }
}
