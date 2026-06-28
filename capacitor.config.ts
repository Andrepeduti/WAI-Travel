import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waitravel.app',
  appName: 'WAI Travel',
  webDir: 'dist',
  // In production, the app serves from the local bundle (dist/).
  // Do NOT set server.url — that would make the app depend on a remote host.
  ios: {
    contentInset: 'always',
  },
};

export default config;
