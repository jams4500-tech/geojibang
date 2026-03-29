// api/toss-login.js - 토스 로그인 서버 API (mTLS 적용)
import { createDecipheriv } from 'crypto';
import https from 'https';

const TOSS_API_BASE = 'https://apps-in-toss-api.toss.im';

// mTLS 에이전트 생성
function getMtlsAgent() {
  const cert = process.env.TOSS_CLIENT_CERT;
  const key = process.env.TOSS_CLIENT_KEY;
  if (!cert || !key) {
    console.warn('[mTLS] 인증서 환경변수 없음 - mTLS 없이 시도');
    return null;
  }
  return new https.Agent({
    cert: cert.replace(/\\n/g, '\n'),
    key: key.replace(/\\n/g, '\n'),
    rejectUnauthorized: true,
  });
}

// AES-256-GCM 복호화
function decryptField(encryptedText) {
  const key = process.env.TOSS_DECRYPT_KEY;
  if (!key || !encryptedText) return null;
  try {
    const IV_LENGTH = 12;
    const aad = process.env.TOSS_DECRYPT_AAD || 'TOSS';
    const decoded = Buffer.from(encryptedText, 'base64');
    const iv = decoded.slice(0, IV_LENGTH);
    const authTag = decoded.slice(decoded.length - 16);
    const ciphertext = decoded.slice(IV_LENGTH, decoded.length - 16);
    const keyBuf = Buffer.from(key, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', keyBuf, iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(aad));
    let dec = decipher.update(ciphertext, null, 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch (e) {
    console.warn('[복호화 실패]', e.message);
    return null;
  }
}

// mTLS fetch 래퍼 (Node.js https 모듈 사용)
function mtlsFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const agent = getMtlsAgent();
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...(agent ? { agent } : {}),
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// 1. authorizationCode + referrer → accessToken
async function generateToken(authorizationCode, referrer) {
  const res = await mtlsFetch(
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
  const data = await res.json();
  if (!res.ok || data.resultType === 'FAIL') {
    throw new Error(`토큰 발급 실패: ${data?.error?.reason || JSON.stringify(data)}`);
  }
  return data.success || data;
}

// 2. accessToken → userKey
async function getUserInfo(accessToken) {
  const res = await mtlsFetch(
    `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );
  const data = await res.json();
  if (!res.ok || data.resultType === 'FAIL') {
    throw new Error(`유저 정보 실패: ${data?.error?.reason || JSON.stringify(data)}`);
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
    const tokenData = await generateToken(authorizationCode, referrer || 'DEFAULT');
    const { accessToken } = tokenData;
    if (!accessToken) throw new Error('accessToken 없음');

    const userInfo = await getUserInfo(accessToken);
    const userKey = userInfo.userKey;
    if (!userKey) throw new Error('userKey 없음');

    const decryptedName = userInfo.name ? decryptField(userInfo.name) : null;

    return res.status(200).json({
      success: true,
      userKey: String(userKey),
      nick: decryptedName || null,
    });

  } catch (e) {
    console.error('[toss-login]', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
}
