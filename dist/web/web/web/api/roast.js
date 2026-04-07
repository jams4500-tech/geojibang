// api/roast.js
// 거지방 AI 핀잔 생성 + 고민상담소 프록시

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { context } = req.body;
  if (!context) {
    return res.status(400).json({ error: 'context 필드가 필요해요' });
  }

  const isCounseling = context.startsWith('[고민상담]');
  const systemPrompt = isCounseling
    ? `당신은 "거지 상담사"입니다. 사용자의 고민을 듣고 철저히 거지의 관점에서, 최대한 돈 안 쓰는 방향으로, 유머러스하고 따끔하게 2-3문장으로 조언합니다. 공감은 하되 사치스러운 해결책은 절대 제시하지 않습니다. 응답은 조언 텍스트만, 따옴표 없이.`
    : `당신은 "거지방장"입니다. 멤버들의 불필요한 지출에 2-3문장으로 따끔하고 유머러스하게 핀잔을 줍니다. 절대 공감하거나 위로하지 않습니다. 실용적 대안을 제시합니다. 응답은 핀잔 텍스트만, 따옴표 없이.`;

  const userMsg = isCounseling ? context.replace('[고민상담] ', '') : `지출: ${context}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text || '말문이 막힙니다. 반성하세요.';
    res.status(200).json({ text });

  } catch (error) {
    console.error('[거지방] roast API 오류:', error);
    res.status(500).json({ text: '말문이 막힙니다. 반성하세요.' });
  }
}
