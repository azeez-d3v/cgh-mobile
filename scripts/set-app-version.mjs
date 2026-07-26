import { readFileSync, writeFileSync } from 'node:fs';

const checkOnly = process.argv.includes('--check');
const requestedVersion = process.argv.slice(2).find((value) => value !== '--check');
const version =
  requestedVersion ??
  (checkOnly ? readJson('app.json').expo?.version : undefined);
if (!version) {
  throw new Error('Usage: npm run version:set -- <major.minor.patch>');
}

const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) throw new Error('Version must use major.minor.patch without a v prefix.');

const [major, minor, patch] = match.slice(1).map(Number);
if (major > 2000 || minor > 999 || patch > 999) {
  throw new Error('Version parts exceed Android versionCode limits.');
}
const versionCode = major * 1_000_000 + minor * 1_000 + patch;

const packageJson = readJson('package.json');
const appJson = readJson('app.json');
const packageLock = readJson('package-lock.json');

if (checkOnly) {
  const mismatches = [
    packageJson.version === version ? undefined : `package.json is ${packageJson.version}`,
    appJson.expo?.version === version ? undefined : `app.json is ${appJson.expo?.version}`,
    appJson.expo?.android?.versionCode === versionCode
      ? undefined
      : `app.json Android versionCode is ${appJson.expo?.android?.versionCode}`,
    packageLock.version === version ? undefined : `package-lock.json is ${packageLock.version}`,
    packageLock.packages?.['']?.version === version
      ? undefined
      : `package-lock root package is ${packageLock.packages?.['']?.version}`,
  ].filter(Boolean);
  if (mismatches.length) {
    throw new Error(
      `Release source is not version ${version} (${mismatches.join('; ')}). Run npm run version:set -- ${version}, validate, and commit the result first.`,
    );
  }
  console.log(`APP_VERSION_OK version=${version} versionCode=${versionCode}`);
  process.exit(0);
}

packageJson.version = version;
appJson.expo.version = version;
appJson.expo.android.versionCode = versionCode;
packageLock.version = version;
packageLock.packages[''].version = version;

writeJson('package.json', packageJson);
writeJson('app.json', appJson);
writeJson('package-lock.json', packageLock);
console.log(`Set app version ${version} (Android versionCode ${versionCode}).`);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
