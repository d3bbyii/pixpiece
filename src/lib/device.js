// 桌機判斷：需要精準指標（滑鼠 / 觸控板）、非行動裝置、視窗夠寬
export function isDesktop() {
  if (typeof window === 'undefined') return true;
  if (new URLSearchParams(window.location.search).has('force')) return true; // 測試用後門
  const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? true;
  const uaMobile =
    navigator.userAgentData?.mobile ??
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const wideEnough = window.innerWidth >= 1024;
  return finePointer && !uaMobile && wideEnough;
}

export function hasCameraApi() {
  return !!navigator.mediaDevices?.getUserMedia;
}
