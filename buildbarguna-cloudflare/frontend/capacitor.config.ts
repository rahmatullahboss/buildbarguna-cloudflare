import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.buildbarguna.app',
  appName: 'বিল্ড বরগুনা',
  webDir: 'dist-app',
  server: {
    // For development — point to your live Cloudflare Worker URL
    // Remove this block for production APK build (uses bundled files)
    // url: 'https://buildbarguna.your-domain.workers.dev',
    // cleartext: true,
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
