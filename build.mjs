import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';

mkdirSync('dist', { recursive: true });

// 1. Vite로 SDK 번들 빌드
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('SDK 번들 빌드 완료');
} catch(e) {
  console.warn('Vite 빌드 실패, SDK 없이 진행:', e.message);
}

// 2. index.html 읽기
let html = readFileSync('index.html', 'utf8');

// 3. SDK 번들 스크립트 태그 삽입 (</head> 바로 앞)
const sdkScript = existsSync('dist/sdk-bundle.js')
  ? `<script src="./sdk-bundle.js"></script>`
  : '';

if (sdkScript) {
  html = html.replace('</head>', sdkScript + '\n</head>');
  console.log('SDK 번들 주입 완료');
}

// 4. dist에 저장
writeFileSync('dist/index.html', html);
console.log('Build complete: dist/index.html');
