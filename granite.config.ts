import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'geojibang',
  brand: {
    displayName: '거지 챌린지',
    primaryColor: '#e8527a',
    icon: '',
  },
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'vercel dev',
      build: 'npm run build',
    },
  },
  permissions: [],
  outdir: 'dist',
  webViewProps: {
    type: 'partner',
  },
});