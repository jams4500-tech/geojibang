// api/toss-reward.js - 토스 포인트 지급 API
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
    const keyRes = await fetch('https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion/key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Toss-User-Key': userKey,
      },
      body: JSON.stringify({ promotionCode })
    });
    const keyData = await keyRes.json();
    const key = keyData?.success?.key || keyData?.key;
    if (!key) {
      console.error('[toss-reward] 키 발급 실패:', JSON.stringify(keyData));
      return res.status(500).json({ error: '지급 키 발급 실패', detail: keyData });
    }

    // 2단계: 포인트 지급
    const execRes = await fetch('https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion/execute-promotion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Toss-User-Key': userKey,
      },
      body: JSON.stringify({ promotionCode, key, amount })
    });
    const execData = await execRes.json();
    console.log('[toss-reward] 지급 결과:', JSON.stringify(execData));

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
