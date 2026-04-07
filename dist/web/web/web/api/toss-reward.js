// api/toss-reward.js - 토스 포인트 지급 API (mTLS)
import https from 'https';

const TOSS_API_BASE = 'https://apps-in-toss-api.toss.im';

function mtlsRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const cert = process.env.TOSS_CLIENT_CERT?.replace(/\\n/g, '\n');
    const key  = process.env.TOSS_CLIENT_KEY?.replace(/\\n/g, '\n');
    const urlObj = new URL(url);
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqOpts = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + (urlObj.search || ''),
      method: options.method || 'POST',
      headers: {
        ...(options.headers || {}),
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
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
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용' });

  const { userKey: rawKey, promotionCode, amount } = req.body;
  if (!rawKey || !promotionCode || !amount) {
    return res.status(400).json({ error: 'userKey, promotionCode, amount 필요' });
  }
  // 숫자만 허용 (헤더 오류 방지)
  const userKey = String(rawKey).replace(/[^0-9]/g, '');
  if (!userKey) return res.status(400).json({ error: '유효하지 않은 userKey' });
  console.log('[toss-reward] userKey:', userKey, '| promo:', promotionCode, '| amount:', amount);

  const API_KEY = process.env.TOSS_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API 키 미설정' });

  const authHeader = `Bearer ${API_KEY}`;

  try {
    // 1단계: 지급 키 발급
    const keyBody = JSON.stringify({ promotionCode });
    const keyRes = await mtlsRequest(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'x-toss-user-key': userKey,
        }
      },
      keyBody
    );

    console.log('[toss-reward] 키 발급 응답:', keyRes.data);
    let keyData;
    try { keyData = keyRes.json(); } catch(e) {
      return res.status(500).json({ error: '키 파싱 실패', raw: keyRes.data });
    }

    const rewardKey = keyData?.success?.key || keyData?.key;
    if (!rewardKey) {
      return res.status(500).json({ error: '지급 키 없음', detail: keyData });
    }

    // 2단계: 포인트 지급
    const execBody = JSON.stringify({ promotionCode, key: rewardKey, amount });
    const execRes = await mtlsRequest(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/promotion/execute-promotion`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'x-toss-user-key': userKey,
        }
      },
      execBody
    );

    console.log('[toss-reward] 지급 결과:', execRes.data);
    let execData;
    try { execData = execRes.json(); } catch(e) {
      return res.status(500).json({ error: '지급 파싱 실패', raw: execRes.data });
    }

    if (execData?.resultType === 'SUCCESS') {
      return res.status(200).json({ success: true, result: execData });
    } else {
      return res.status(200).json({ success: false, result: execData });
    }
  } catch(e) {
    console.error('[toss-reward] 오류:', e);
    return res.status(500).json({ error: e.message });
  }
}
