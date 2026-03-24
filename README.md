# 거지방 🥫

> 매일 매시 매초 본인이 거지임을 잊지마세요

## 배포 방법

### 1. GitHub에 올리기

```bash
git init
git add .
git commit -m "거지방 첫 배포"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/geojibang.git
git push -u origin main
```

### 2. Vercel에 배포하기

1. vercel.com 로그인
2. "Add New Project" 클릭
3. GitHub 레포 선택 (geojibang)
4. **Environment Variables** 설정 (중요!)

| 변수명 | 값 |
|--------|-----|
| `ANTHROPIC_API_KEY` | Anthropic 콘솔에서 발급한 API 키 |
| `CRON_SECRET` | 아무 랜덤 문자열 (예: gj2026secret!) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase 서비스 계정 JSON (한 줄) |

5. Deploy 클릭 → 완료!

### 3. Firebase 서비스 계정 키 발급

1. Firebase 콘솔 → 프로젝트 설정 (톱니바퀴)
2. 서비스 계정 탭
3. "새 비공개 키 생성" 클릭
4. 다운로드된 JSON 파일 내용을 **한 줄로** 변환
   ```bash
   cat serviceAccountKey.json | tr -d '\n'
   ```
5. 그 값을 `FIREBASE_SERVICE_ACCOUNT` 환경변수에 입력

### 4. Vercel Cron 설정 (거지왕 월별 집계)

vercel.json에 추가:
```json
{
  "crons": [{
    "path": "/api/cron-ranking",
    "schedule": "0 23 L * *"
  }]
}
```
(매달 마지막 날 UTC 23:00 = 한국 시간 다음날 오전 8시)

## 프로젝트 구조

```
geojibang/
├── index.html          ← 앱 본체
├── api/
│   ├── roast.js        ← AI 핀잔 생성
│   ├── report.js       ← 주간 리포트
│   └── cron-ranking.js ← 거지왕 월별 집계
├── vercel.json         ← Vercel 설정
├── .env.local          ← 로컬 환경변수 (Git 제외)
├── .gitignore
└── README.md
```

## Firebase 컬렉션 구조

| 컬렉션 | 용도 |
|--------|------|
| `geojibang_users` | 유저 프로필, 거지력, 구독 상태 |
| `geojibang_posts` | 피드 게시물 |
| `geojibang_posts/{id}/geojibang_comments` | 댓글 |
| `geojibang_ranking` | 월별 거지왕 랭킹 |

> hot8-miniapp과 완전 분리 — 모든 컬렉션에 `geojibang_` prefix 적용
