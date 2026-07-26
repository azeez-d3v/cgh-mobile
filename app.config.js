const appJson = require('./app.json');

module.exports = ({ config }) => {
  const baseConfig = appJson.expo;
  const appEnvironment = process.env.APP_VARIANT === 'development' ? 'development' : 'production';
  const isDevelopment = appEnvironment === 'development';
  const productionPackage = baseConfig.android?.package ?? 'com.azeezd3v.cghmobile';

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
    },
  };
};
