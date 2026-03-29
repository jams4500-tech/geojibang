// 앱인토스 SDK 진입점 - window에 모든 SDK 함수 노출
import {
  TossAds,
  loadFullScreenAd,
  showFullScreenAd,
  appLogin,
} from '@apps-in-toss/web-framework';

// 광고
window.TossAds = TossAds;
window.loadFullScreenAd = loadFullScreenAd;
window.showFullScreenAd = showFullScreenAd;

// 로그인
window.appLogin = appLogin;

// AppsInToss 네임스페이스 (기존 코드 호환)
window.AppsInToss = window.AppsInToss || {};
window.AppsInToss.appLogin = appLogin;

console.log('[AIT SDK] 로드 완료', {
  TossAds: !!TossAds,
  appLogin: !!appLogin,
  loadFullScreenAd: !!loadFullScreenAd,
});
