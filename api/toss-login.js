// api/toss-login.js - 토스 로그인 (mTLS 적용)
import { createDecipheriv, createSecureContext } from 'crypto';
import https from 'https';

const TOSS_API_BASE = 'https://apps-in-toss-api.toss.im';

// mTLS https.request 래퍼
function mtlsRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const cert = process.env.TOSS_CLIENT_CERT?.replace(/\\n/g, '\n');
    const key  = process.env.TOSS_CLIENT_KEY?.replace(/\\n/g, '\n');

    const urlObj = new URL(url);
    const reqOpts = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...(cert && key ? { cert, key } : {}),
    };

    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          data,
          json() { return JSON.parse(this.data); }
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
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

async function generateToken(authorizationCode, referrer) {
  const body = JSON.stringify({ authorizationCode, referrer });
  const res = await mtlsRequest(
    `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${process.env.TOSS_API_KEY}`,
      },
    },
    body
  );
  const data = res.json();
  if (!res.ok || data?.resultType === 'FAIL') {
    throw new Error(`토큰 발급 실패 (${res.status}): ${data?.error?.reason || res.data}`);
  }
  return data?.success || data;
}

async function getUserInfo(accessToken) {
  const res = await mtlsRequest(
    `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );
  const data = res.json();
  if (!res.ok || data?.resultType === 'FAIL') {
    throw new Error(`유저 정보 실패 (${res.status}): ${data?.error?.reason || res.data}`);
  }
  return data?.success || data;
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
    console.log('[toss-login] 시작 - authCode:', authorizationCode?.slice(0,10)+'...');
    const tokenData = await generateToken(authorizationCode, referrer || 'DEFAULT');
    const { accessToken } = tokenData;
    if (!accessToken) throw new Error('accessToken 없음');
    console.log('[toss-login] accessToken 발급 성공');

    const userInfo = await getUserInfo(accessToken);
    console.log('[toss-login] userInfo 응답:', JSON.stringify({ userKey: userInfo?.userKey, hasName: !!userInfo?.name }));
    const userKey = userInfo?.userKey;
    if (!userKey) throw new Error('userKey 없음 - userInfo: ' + JSON.stringify(userInfo));

    const decryptedName = userInfo?.name ? decryptField(userInfo.name) : null;
    console.log('[toss-login] 성공 - userKey:', userKey);

    return res.status(200).json({
      success: true,
      userKey: String(userKey),
      nick: decryptedName || null,
    });

  } catch (e) {
    console.error('[toss-login] 실패:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
}
