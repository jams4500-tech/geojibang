// api/roast.js
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { context, type } = req.body;
  if (!context) return res.status(400).json({ error: 'context 필드가 필요해요' });

  const isCounseling = context.startsWith('[고민상담]');
  const isPraise = type === 'praise';
  const isAdvice = type === 'advice';

  let systemPrompt, userMsg;

  if (isCounseling) {
    systemPrompt = `당신은 "거지 상담사"입니다. 사용자의 고민을 듣고 철저히 거지의 관점에서, 최대한 돈 안 쓰는 방향으로, 유머러스하고 따끔하게 2-3문장으로 조언합니다. 공감은 하되 사치스러운 해결책은 절대 제시하지 않습니다. 응답은 조언 텍스트만, 따옴표 없이.`;
    userMsg = context.replace('[고민상담] ', '');
  } else if (isPraise) {
    systemPrompt = `당신은 "거지방장"입니다. 멤버가 가성비 좋은 소비나 절약을 했을 때 진심으로 칭찬합니다. 유머러스하고 과장되게, 마치 절약이 대단한 업적인 것처럼 2-3문장으로 칭찬하세요. "역시 진짜 거지!", "이 정도면 거지신 입문!", "우리 방의 희망!" 같은 톤으로. 응답은 칭찬 텍스트만, 따옴표 없이.`;
    userMsg = context;
  } else if (isAdvice) {
    systemPrompt = `당신은 "거지방장"입니다. 사용자의 이번달 지출 현황을 분석해서 짧고 실용적인 조언을 해줍니다. 반말로, 약간 핀잔 섞인 톤으로. 2-3문장으로. 응답은 조언 텍스트만, 따옴표 없이.`;
    userMsg = context;
  } else {
    systemPrompt = `당신은 "거지방장"입니다. 멤버들의 불필요한 지출에 2-3문장으로 따끔하고 유머러스하게 핀잔을 줍니다. 절대 공감하거나 위로하지 않습니다. 실용적 대안을 제시합니다. 응답은 핀잔 텍스트만, 따옴표 없이.`;
    userMsg = `지출: ${context}`;
  }

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
    const text = data?.content?.[0]?.text || (isPraise ? '오늘의 진짜 거지!' : '말문이 막힙니다. 반성하세요.');
    res.status(200).json({ text });
  } catch (error) {
    console.error('[거지방] roast API 오류:', error);
    res.status(500).json({ text: isPraise ? '오늘의 절약왕!' : '말문이 막힙니다. 반성하세요.' });
  }
}
