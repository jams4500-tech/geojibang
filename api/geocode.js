// api/geocode.js - 네이버 지오코딩 API 프록시
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query 필요' });

  const CLIENT_ID = process.env.NAVER_MAP_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'API 키 미설정' });
  }

  try {
    const r = await fetch(
      `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'x-ncp-apigw-api-key-id': CLIENT_ID,
          'x-ncp-apigw-api-key': CLIENT_SECRET,
        }
      }
    );
    const data = await r.json();
    const addr = data?.addresses?.[0];
    if (!addr) return res.status(200).json({ error: '주소를 찾을 수 없어요' });

    res.status(200).json({
      lat: parseFloat(addr.y),
      lng: parseFloat(addr.x),
      roadAddress: addr.roadAddress,
      jibunAddress: addr.jibunAddress,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
