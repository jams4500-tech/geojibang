import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

mkdirSync('dist', { recursive: true });

// 1. Vite로 SDK 번들 빌드
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('SDK 번들 빌드 완료');
} catch(e) {
  console.warn('Vite 빌드 실패:', e.message);
}

// 2. index.html에 SDK 번들 주입
let html = readFileSync('index.html', 'utf8');
const sdkScript = existsSync('dist/sdk-bundle.js')
  ? `<script src="./sdk-bundle.js"></script>`
  : '';
if (sdkScript) {
  html = html.replace('</head>', sdkScript + '\n</head>');
  console.log('SDK 번들 주입 완료');
}
writeFileSync('dist/index.html', html);

// 3. 나머지 HTML 파일 복사
['admin.html', 'privacy.html', 'terms.html'].forEach(f => {
  if (existsSync(f)) { copyFileSync(f, 'dist/' + f); console.log(f + ' 복사'); }
});

// 4. api/ 폴더 복사 (Vercel serverless functions)
if (existsSync('api')) {
  mkdirSync('dist/api', { recursive: true });
  readdirSync('api').forEach(f => {
    copyFileSync('api/' + f, 'dist/api/' + f);
    console.log('api/' + f + ' 복사');
  });
}

console.log('Build complete');
