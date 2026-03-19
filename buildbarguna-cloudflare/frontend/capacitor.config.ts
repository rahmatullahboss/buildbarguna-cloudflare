import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.buildbarguna.app',
  appName: 'BBI',
  webDir: 'dist-app',
  server: {
    // androidScheme: 'https' ensures cookies and APIs work correctly
    // without this, app runs on capacitor:// scheme
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#15803d', // primary-700 green
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'buildbarguna',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#15803d',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#15803d',
    },
  },
}

export default config
