// api/toss-reward.js - 토스 포인트 지급 API (mTLS)
import https from 'https';

const TOSS_API_BASE = 'https://apps-in-toss-api.toss.im';

function mtlsRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const cert = process.env.TOSS_CLIENT_CERT?.replace(/\\n/g, '\n');
    const key  = process.env.TOSS_CLIENT_KEY?.replace(/\\n/g, '\n');
    const urlObj = new URL(url);
    const reqOpts = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + (urlObj.search || ''),
      method: options.method || 'POST',
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용' });

  const { userKey, promotionCode, amount } = req.body;
  if (!userKey || !promotionCode || !amount) {
    return res.status(400).json({ error: 'userKey, promotionCode, amount 필요' });
  }

  const API_KEY = process.env.TOSS_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API 키 미설정' });

  try {
    // 1단계: 지급 키 발급
    const keyRes = await mtlsRequest(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/promotion/key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-toss-user-key': userKey,
        }
      },
      { promotionCode }
    );

    const keyText = keyRes.data;
    console.log('[toss-reward] 키 발급 응답:', keyText);
    let keyData;
    try { keyData = JSON.parse(keyText); } catch(e) { return res.status(500).json({ error: '키 발급 파싱 실패', raw: keyText }); }

    const key = keyData?.success?.key || keyData?.key;
    if (!key) {
      return res.status(500).json({ error: '지급 키 발급 실패', detail: keyData });
    }

    // 2단계: 포인트 지급
    const execRes = await mtlsRequest(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/promotion/execute-promotion`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-toss-user-key': userKey,
        }
      },
      { promotionCode, key, amount }
    );

    const execText = execRes.data;
    console.log('[toss-reward] 지급 결과:', execText);
    let execData;
    try { execData = JSON.parse(execText); } catch(e) { return res.status(500).json({ error: '지급 파싱 실패', raw: execText }); }

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
