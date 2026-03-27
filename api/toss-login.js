// api/toss-login.js
// 토스 로그인: authorizationCode + referrer → userKey
// 문서: https://developers-apps-in-toss.toss.im/login/develop.md
//
// 필요 환경변수 (Vercel):
//   TOSS_API_KEY   - 앱인토스 API 키 (Bearer)
//   TOSS_CLIENT_CERT / TOSS_CLIENT_KEY - mTLS 인증서 (있을 때만)

const TOSS_API_BASE = 'https://apps-in-toss-api.toss.im';

// mTLS 에이전트 (Node 18 + undici 기준)
function getAgentOptions() {
  if (!process.env.TOSS_CLIENT_CERT || !process.env.TOSS_CLIENT_KEY) return {};
  return {
    // Vercel에서 mTLS는 fetch options에 직접 지원 안 됨 → 환경변수 있으면 헤더로 대체 처리
  };
}

// Step 1: authorizationCode → accessToken + userKey
async function generateToken(authorizationCode, referrer) {
  const res = await fetch(
    `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TOSS_API_KEY}`,
      },
      body: JSON.stringify({ authorizationCode, referrer }),
    }
  );

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`토스 응답 파싱 실패: ${text}`); }

  if (!res.ok || data.resultType === 'FAIL') {
    const reason = data?.error?.reason || data?.error || text;
    throw new Error(`토큰 발급 실패 (${res.status}): ${reason}`);
  }

  // 성공: { resultType: "SUCCESS", success: { accessToken, refreshToken, expiresIn, ... } }
  return data.success || data;
}

// Step 2: accessToken → userKey (사용자 정보)
async function getUserInfo(accessToken) {
  const res = await fetch(
    `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`유저 정보 파싱 실패: ${text}`); }

  if (!res.ok || data.resultType === 'FAIL') {
    const reason = data?.error?.reason || text;
    throw new Error(`유저 정보 조회 실패 (${res.status}): ${reason}`);
  }

  return data.success || data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { authorizationCode, referrer } = req.body || {};
  if (!authorizationCode) return res.status(400).json({ error: 'authorizationCode 필요' });
  if (!process.env.TOSS_API_KEY) return res.status(500).json({ error: 'TOSS_API_KEY 미설정' });

  try {
    // 1. 토큰 발급
    const tokenData = await generateToken(authorizationCode, referrer || 'DEFAULT');
    const { accessToken } = tokenData;
    if (!accessToken) throw new Error('accessToken을 받지 못했어요');

    // 2. 유저 정보 (userKey)
    const userInfo = await getUserInfo(accessToken);
    const userKey = userInfo.userKey;
    if (!userKey) throw new Error('userKey를 받지 못했어요');

    return res.status(200).json({
      success: true,
      userKey: String(userKey),
      nick: null, // 토스는 닉네임 미제공 → 앱에서 직접 설정
    });

  } catch (e) {
    console.error('[toss-login]', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
}
