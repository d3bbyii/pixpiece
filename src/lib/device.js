// 裝置與版面判斷：電腦、平板、手機都支援
export const WIDE_MIN_W = 900;
export const WIDE_MIN_H = 560;

/** 觸控為主的裝置（手機、平板） */
export function isTouch() {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

/**
 * wide：電腦與橫向平板，使用完整的多視窗桌面版面（等比縮放）
 * compact：手機與直向平板，使用直式單欄版面
 */
export function getLayout() {
  if (typeof window === 'undefined') return 'wide';
  const q = new URLSearchParams(window.location.search).get('layout'); // 測試用：?layout=compact
  if (q === 'wide' || q === 'compact') return q;
  return window.innerWidth >= WIDE_MIN_W && window.innerHeight >= WIDE_MIN_H ? 'wide' : 'compact';
}

/** 手機橫拿：畫面太矮，建議轉成直向 */
export function isPhoneLandscape() {
  return isTouch() && window.innerHeight < 500 && window.innerWidth > window.innerHeight;
}

export function hasCameraApi() {
  return !!navigator.mediaDevices?.getUserMedia;
}
