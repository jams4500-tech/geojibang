// api/geocode.js - 네이버 지오코딩 API 프록시 (주소 + 장소명 검색)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query 필요' });

  const CLIENT_ID = process.env.NAVER_MAP_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_MAP_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) return res.status(500).json({ error: 'API 키 미설정' });

  const headers = {
    'x-ncp-apigw-api-key-id': CLIENT_ID,
    'x-ncp-apigw-api-key': CLIENT_SECRET,
  };

  try {
    // 1차: Geocoding API (주소 검색)
    const geoRes = await fetch(
      `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
      { headers }
    );
    const geoText = await geoRes.text();
    if (geoText) {
      const geoData = JSON.parse(geoText);
      const addr = geoData?.addresses?.[0];
      if (addr) {
        return res.status(200).json({
          lat: parseFloat(addr.y),
          lng: parseFloat(addr.x),
          roadAddress: addr.roadAddress,
          jibunAddress: addr.jibunAddress,
        });
      }
    }

    // 2차: 주소 검색 실패 시 장소명으로 검색 (Reverse Geocoding이 아닌 로컬 검색)
    // 네이버 검색 API 대신 좌표 없으면 에러 반환
    return res.status(200).json({ error: '검색 결과가 없어요. 도로명 주소로 다시 검색해보세요.' });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
