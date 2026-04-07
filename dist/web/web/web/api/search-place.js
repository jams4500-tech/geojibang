// api/search-place.js - 네이버 지역 검색 API 프록시
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query 필요' });

  const CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) return res.status(500).json({ error: 'API 키 미설정' });

  try {
    const r = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`,
      {
        headers: {
          'X-Naver-Client-Id': CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET,
        }
      }
    );
    const data = await r.json();
    if (!data.items?.length) return res.status(200).json({ results: [] });

    // HTML 태그 제거
    const clean = s => s?.replace(/<[^>]+>/g, '') || '';

    const results = data.items.map(item => ({
      name: clean(item.title),
      address: item.roadAddress || item.address,
      category: clean(item.category),
      mapx: item.mapx,  // 경도 * 1e7
      mapy: item.mapy,  // 위도 * 1e7
    }));

    res.status(200).json({ results });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
