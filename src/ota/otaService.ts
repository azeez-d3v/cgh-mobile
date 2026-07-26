import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import { Buffer } from 'buffer';
import nacl from 'tweetnacl';
import type { OtaChannel, OtaManifest } from './types';

const REQUEST_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const MAX_BUNDLE_BYTES = 40 * 1024 * 1024;
const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

type OtaNativeModule = {
  getCurrentVersion: (placeholder: number) => Promise<string>;
  setupBundlePath: (
    path: string,
    extension?: string,
    version?: number,
    maxVersions?: number,
    metadata?: string,
  ) => Promise<boolean>;
  restart: () => void;
};

type BlobUtilModule = {
  config: (options: { fileCache: boolean; appendExt: string; timeout: number }) => {
    fetch: (
      method: 'GET',
      url: string,
      headers?: Record<string, string>,
    ) => OtaDownloadTask;
  };
  fs: {
    hash: (path: string, algorithm: 'sha256') => Promise<string>;
    stat: (path: string) => Promise<{ size: number | string }>;
    unlink: (path: string) => Promise<void>;
  };
};

type OtaDownloadTask = Promise<{ path: () => string }> & {
  cancel: () => OtaDownloadTask;
  progress: (
    options: { interval: number },
    callback: (received: number | string, total: number | string) => void,
  ) => OtaDownloadTask;
};

type ExpoExtra = {
  appEnvironment?: string;
  ota?: {
    baseUrl?: string;
    publicKey?: string;
  };
};

export type OtaCheckResult = {
  manifest?: OtaManifest;
  available: boolean;
  currentBundleVersion: number;
  checkedAt: string;
};

export function otaChannel(): OtaChannel {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  return extra?.appEnvironment === 'development' ? 'development' : 'production';
}

export function nativeAppVersion() {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
}

export function isOtaSupported() {
  return !__DEV__ && Platform.OS === 'android';
}

export async function checkForOtaUpdate(): Promise<OtaCheckResult> {
  assertSupported();
  const config = otaConfig();
  const channel = otaChannel();
  // Keep each native app version on its own pointer so older APKs retain
  // their final compatible update after a newer APK is released.
  const manifestUrl = `${config.baseUrl}/${channel}/${encodeURIComponent(nativeAppVersion())}/update.json`;
  const cacheBuster = `t=${Date.now()}`;
  const manifestText = await fetchText(`${manifestUrl}?${cacheBuster}`, true);
  const currentBundleVersion = Number(await nativeModule().getCurrentVersion(0)) || 0;
  const checkedAt = new Date().toISOString();

  if (manifestText === undefined) {
    return { available: false, currentBundleVersion, checkedAt };
  }

  const signatureText = await fetchText(`${manifestUrl}.sig?${cacheBuster}`);
  if (!signatureText) throw new Error('The signed update manifest is incomplete.');

  verifyManifestSignature(manifestText, signatureText.trim(), config.publicKey);
  const manifest = parseManifest(manifestText);
  validateManifest(manifest, channel);

  const available = manifest.bundleVersion > currentBundleVersion;
  await AsyncStorage.setItem(
    lastCheckKey(),
    JSON.stringify({
      checkedAt,
      currentBundleVersion,
      latestBundleVersion: manifest.bundleVersion,
    }),
  ).catch(() => undefined);

  return { manifest, available, currentBundleVersion, checkedAt };
}

export async function installOtaUpdate(
  manifest: OtaManifest,
  onProgress: (progress: number) => void,
) {
  assertSupported();
  validateManifest(manifest, otaChannel());
  validateDownloadUrl(manifest.downloadUrl);

  const blobUtil = blobModule();
  let downloadedPath: string | undefined;

  try {
    const request = blobUtil
      .config({ fileCache: true, appendExt: 'zip', timeout: DOWNLOAD_TIMEOUT_MS })
      .fetch('GET', manifest.downloadUrl, {
        Accept: 'application/zip,application/octet-stream',
      });
    request.progress({ interval: 180 }, (receivedValue, totalValue) => {
      const received = Number(receivedValue);
      const total = Number(totalValue);
      if (received > MAX_BUNDLE_BYTES || total > MAX_BUNDLE_BYTES) {
        request.cancel();
        return;
      }
      if (total > 0) onProgress(Math.min(received / total, 0.99));
    });

    const response = await request;
    downloadedPath = response.path();

    const stat = await blobUtil.fs.stat(downloadedPath);
    const actualSize = Number(stat.size);
    if (!Number.isFinite(actualSize) || actualSize <= 0 || actualSize > MAX_BUNDLE_BYTES) {
      throw new Error('The downloaded update has an invalid file size.');
    }
    if (manifest.size > 0 && actualSize !== manifest.size) {
      throw new Error('The update download is incomplete. Please try again.');
    }

    const actualHash = (await blobUtil.fs.hash(downloadedPath, 'sha256')).toLowerCase();
    if (actualHash !== manifest.sha256.toLowerCase()) {
      throw new Error('Update verification failed. The downloaded file was rejected.');
    }

    const installed = await nativeModule().setupBundlePath(
      downloadedPath,
      '.bundle',
      manifest.bundleVersion,
      3,
      JSON.stringify(manifest),
    );
    if (!installed) throw new Error('The update could not be installed.');
    downloadedPath = undefined;
    onProgress(1);
  } finally {
    if (downloadedPath) {
      await blobUtil.fs.unlink(downloadedPath).catch(() => undefined);
    }
  }
}

export async function restartWithInstalledUpdate() {
  assertSupported();
  nativeModule().restart();
}

export async function readLastOtaCheck() {
  const value = await AsyncStorage.getItem(lastCheckKey()).catch(() => null);
  if (!value) return undefined;
  try {
    return JSON.parse(value) as {
      checkedAt?: string;
      currentBundleVersion?: number;
      latestBundleVersion?: number;
    };
  } catch {
    return undefined;
  }
}

function otaConfig() {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  const baseUrl = extra?.ota?.baseUrl?.replace(/\/+$/, '');
  const publicKey = extra?.ota?.publicKey?.trim();
  if (!baseUrl || !publicKey) throw new Error('App update configuration is incomplete.');
  if (!baseUrl.startsWith('https://')) throw new Error('App updates require HTTPS.');
  return { baseUrl, publicKey };
}

function lastCheckKey() {
  return `cgh.ota.last-check.v1.${otaChannel()}.${nativeAppVersion()}`;
}

function verifyManifestSignature(manifestText: string, signatureBase64: string, publicKeyBase64: string) {
  const signature = Buffer.from(signatureBase64, 'base64');
  const publicKey = Buffer.from(publicKeyBase64, 'base64');
  if (signature.length !== nacl.sign.signatureLength || publicKey.length !== nacl.sign.publicKeyLength) {
    throw new Error('The update signature is invalid.');
  }
  const valid = nacl.sign.detached.verify(
    new Uint8Array(Buffer.from(manifestText, 'utf8')),
    new Uint8Array(signature),
    new Uint8Array(publicKey),
  );
  if (!valid) throw new Error('The update manifest could not be verified.');
}

function parseManifest(text: string): OtaManifest {
  try {
    return JSON.parse(text) as OtaManifest;
  } catch {
    throw new Error('The update manifest is not valid JSON.');
  }
}

function validateManifest(manifest: OtaManifest, expectedChannel: OtaChannel) {
  if (
    manifest.schemaVersion !== 1 ||
    manifest.platform !== 'android' ||
    manifest.channel !== expectedChannel ||
    !manifest.id ||
    !Number.isSafeInteger(manifest.bundleVersion) ||
    manifest.bundleVersion <= 0 ||
    manifest.targetAppVersion !== nativeAppVersion() ||
    !/^[a-f0-9]{64}$/i.test(manifest.sha256) ||
    !Number.isSafeInteger(manifest.size) ||
    manifest.size <= 0 ||
    manifest.size > MAX_BUNDLE_BYTES ||
    !Array.isArray(manifest.releaseNotes) ||
    !manifest.releaseNotes.every((note) => typeof note === 'string') ||
    Number.isNaN(Date.parse(manifest.publishedAt))
  ) {
    throw new Error('This update is not compatible with the installed app.');
  }
  validateDownloadUrl(manifest.downloadUrl);
}

function validateDownloadUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The update download URL is invalid.');
  }
  if (url.protocol !== 'https:' || !ALLOWED_DOWNLOAD_HOSTS.has(url.hostname)) {
    throw new Error('The update download host is not trusted.');
  }
}

async function fetchText(url: string, allowNotFound = false): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json,text/plain',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    if (response.status === 404 && allowNotFound) return undefined;
    if (response.status === 404) throw new Error('The signed update manifest is incomplete.');
    if (!response.ok) throw new Error(`Update server returned ${response.status}.`);
    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The update check timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assertSupported() {
  if (!isOtaSupported()) {
    throw new Error('Hot updates are available in installed Android builds.');
  }
}

function nativeModule(): OtaNativeModule {
  const turboModule = require('react-native-ota-hot-update/lib/commonjs/NativeOtaHotUpdate') as {
    default?: OtaNativeModule;
  };
  const module = turboModule.default ?? (NativeModules.OtaHotUpdate as OtaNativeModule | undefined);
  if (!module) throw new Error('The native hot-update module is not available.');
  return module;
}

function blobModule(): BlobUtilModule {
  const imported = require('react-native-blob-util') as { default?: BlobUtilModule } & BlobUtilModule;
  return imported.default ?? imported;
}
