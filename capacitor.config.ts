import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.06919f1357c645dc9f7d92f69d9c701b',
  appName: 'waitravel',
  webDir: 'dist',
  server: {
    url: 'https://06919f13-57c6-45dc-9f7d-92f69d9c701b.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
