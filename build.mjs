import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

// npx ait build가 dist/web에 결과물을 만들므로 동일하게 사용
const OUT = 'dist/web';
mkdirSync(OUT, { recursive: true });

// 1. Vite로 SDK 번들 빌드
try {
  execSync('npx vite build --outDir dist/web', { stdio: 'inherit' });
  console.log('SDK 번들 빌드 완료');
} catch(e) {
  console.warn('Vite 빌드 실패:', e.message);
}

// 2. index.html에 SDK 번들 주입
let html = readFileSync('index.html', 'utf8');
const sdkPath = OUT + '/sdk-bundle.js';
const sdkScript = existsSync(sdkPath) ? `<script src="./sdk-bundle.js"></script>` : '';
if (sdkScript) {
  html = html.replace('</head>', sdkScript + '\n</head>');
  console.log('SDK 번들 주입 완료');
}
writeFileSync(OUT + '/index.html', html);

// 3. 나머지 HTML 파일 복사
['admin.html', 'privacy.html', 'terms.html'].forEach(f => {
  if (existsSync(f)) { copyFileSync(f, OUT + '/' + f); console.log(f + ' 복사'); }
});

// 4. api/ 폴더 복사
if (existsSync('api')) {
  mkdirSync(OUT + '/api', { recursive: true });
  readdirSync('api').forEach(f => {
    copyFileSync('api/' + f, OUT + '/api/' + f);
    console.log('api/' + f + ' 복사');
  });
}

console.log('Build complete → ' + OUT);
