import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'geojibang',
  brand: {
    displayName: '거지 챌린지',
    primaryColor: '#e8527a',
    icon: 'https://static.toss.im/appsintoss/30705/1e023176-068e-42b8-811c-91bb763ab1fd.png',
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
  outdir: 'dist/web',
  webViewProps: {
    type: 'partner',
  },
});
