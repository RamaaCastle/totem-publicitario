import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.signage.player',
  appName: 'Signage Player',
  webDir: 'dist/renderer',
  server: {
    url: 'http://187.77.53.136/player',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#000000',
  },
};

export default config;
