import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

const OUT = 'dist/web/web/web';
mkdirSync(OUT, { recursive: true });

try {
  execSync(`npx vite build --outDir ${OUT}`, { stdio: 'inherit' });
  console.log('SDK 번들 빌드 완료');
} catch(e) {
  console.warn('Vite 빌드 실패:', e.message);
}

let html = readFileSync('index.html', 'utf8');
const sdkPath = OUT + '/sdk-bundle.js';
const sdkScript = existsSync(sdkPath) ? `<script src="./sdk-bundle.js"></script>` : '';
if (sdkScript) {
  html = html.replace('</head>', sdkScript + '\n</head>');
  console.log('SDK 번들 주입 완료');
}
writeFileSync(OUT + '/index.html', html);

['admin.html', 'privacy.html', 'terms.html'].forEach(f => {
  if (existsSync(f)) { copyFileSync(f, OUT + '/' + f); console.log(f + ' 복사'); }
});

if (existsSync('api')) {
  mkdirSync(OUT + '/api', { recursive: true });
  readdirSync('api').filter(f => !f.startsWith('.')).forEach(f => {
    copyFileSync('api/' + f, OUT + '/api/' + f);
    console.log('api/' + f + ' 복사');
  });
}

console.log('Build complete → ' + OUT);
