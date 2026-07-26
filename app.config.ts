import type { ConfigContext, ExpoConfig } from 'expo/config';
import appJson from './app.json';

const baseConfig = appJson.expo as ExpoConfig;

export default ({ config }: ConfigContext): ExpoConfig => {
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
