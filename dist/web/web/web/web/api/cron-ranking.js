// api/cron-ranking.js
// 거지왕 월별 집계 크론잡
// Vercel Cron: 매달 1일 오전 8시 (KST = UTC+9, 즉 UTC 23:00 전날)
// vercel.json crons 설정: "0 23 L * *"

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';

// Firebase Admin 초기화 (서버용 — 클라이언트 SDK와 다름)
function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  }
  return getFirestore();
}

const REWARD_MAP = [100000, 30000, 10000, 10000, 10000];
const TITLE_MAP  = ['거지왕 👑', '거지대장 🎖', '거지반장 📛', '거지반장 📛', '거지반장 📛'];

export default async function handler(req, res) {
  // Vercel Cron 인증 확인
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getAdminDb();
    const now = new Date();
    // 전달 기준 (크론이 1일에 실행되므로 전달 집계)
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    // 1. 월 거지력 상위 5명 집계
    const usersSnap = await db
      .collection('geojibang_users')
      .orderBy('monthScore', 'desc')
      .limit(5)
      .get();

    const rankers = usersSnap.docs.map((doc, i) => ({
      rank: i + 1,
      uid: doc.id,
      nick: doc.data().nick,
      monthScore: doc.data().monthScore || 0,
      totalScore: doc.data().totalScore || 0,
      title: TITLE_MAP[i],
      reward: REWARD_MAP[i]
    }));

    // 2. 랭킹 저장
    await db.collection('geojibang_ranking').doc(yearMonth).set({
      rankers,
      announcedAt: new Date(),
      yearMonth
    });

    // 3. 수상자들에게 리워드 지급 표시 (실제 포인트 지급은 토스 SDK 연동 후)
    const batch = db.batch();
    rankers.forEach(r => {
      const ref = db.collection('geojibang_users').doc(r.uid);
      batch.update(ref, {
        [`rewards.${yearMonth}`]: {
          rank: r.rank,
          title: r.title,
          rewardPoints: r.reward,
          claimed: false,
          awardedAt: new Date()
        }
      });
    });
    await batch.commit();

    // 4. 월 거지력 초기화 (누적 거지력은 건드리지 않음)
    const allUsersSnap = await db.collection('geojibang_users').get();
    const resetBatch = db.batch();
    allUsersSnap.docs.forEach(doc => {
      resetBatch.update(doc.ref, { monthScore: 0 });
    });
    await resetBatch.commit();

    console.log(`[거지방] ${yearMonth} 거지왕 집계 완료:`, rankers.map(r => r.nick));
    res.status(200).json({ success: true, yearMonth, rankers });

  } catch (error) {
    console.error('[거지방] 크론잡 오류:', error);
    res.status(500).json({ error: error.message });
  }
}
