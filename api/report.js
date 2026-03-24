// api/report.js
// 거지방 주간 리포트 생성 프록시

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { spendData, income, savingGoal } = req.body;
  if (!spendData) return res.status(400).json({ error: 'spendData 필드가 필요해요' });

  try {
    const ctx = `이번달 총 지출 ${spendData.total?.toLocaleString()}원. ` +
      `카테고리별: ${spendData.categories?.map(c => `${c.label} ${c.amt?.toLocaleString()}원`).join(', ')}.` +
      (income ? ` 월수입 ${income.toLocaleString()}원.` : '') +
      (savingGoal ? ` 저축목표 ${savingGoal.toLocaleString()}원.` : '');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: `당신은 친근한 가계부 코치입니다. 사용자의 소비 데이터를 분석해 3-4문장으로 핵심만 짚어주세요. 따끔하지만 응원하는 톤으로, 구체적인 절약 액션 1가지를 꼭 제안하세요. 이모지 1-2개 사용.`,
        messages: [{ role: 'user', content: `이번 주 소비 데이터: ${ctx}` }]
      })
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text || '분석 중 오류가 발생했어요.';
    res.status(200).json({ text });

  } catch (error) {
    console.error('[거지방] report API 오류:', error);
    res.status(500).json({ text: '네트워크 오류가 발생했어요.' });
  }
}
