const appJson = require('./app.json');
const fs = require('node:fs');
const path = require('node:path');

const otaPublicKey = fs
  .readFileSync(path.join(__dirname, 'config', 'ota-public-key.txt'), 'utf8')
  .trim();

module.exports = ({ config }) => {
  const baseConfig = appJson.expo;
  const appEnvironment = process.env.APP_VARIANT === 'development' ? 'development' : 'production';
  const isDevelopment = appEnvironment === 'development';
  const productionPackage = baseConfig.android?.package ?? 'com.azeezd3v.cghmobile';
  const otaBaseUrls = (
    process.env.EXPO_PUBLIC_OTA_BASE_URLS ||
    [
      'https://azeez-d3v.github.io/cgh-mobile-downloads/ota',
      'https://raw.githubusercontent.com/azeez-d3v/cgh-mobile-downloads/production/ota',
    ].join(',')
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    ...config,
    ...baseConfig,
    name: isDevelopment ? 'CGH Mobile Dev' : 'CGH Mobile',
    android: {
      ...baseConfig.android,
      package: isDevelopment ? `${productionPackage}.dev` : productionPackage,
    },
    extra: {
      ...baseConfig.extra,
      appEnvironment,
      ota: {
        baseUrl: otaBaseUrls[0],
        baseUrls: otaBaseUrls,
        publicKey: process.env.EXPO_PUBLIC_OTA_PUBLIC_KEY || otaPublicKey,
      },
    },
  };
};
