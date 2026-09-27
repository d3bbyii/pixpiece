import { CAMERA } from '../config.js';

export async function openCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: CAMERA.width },
      height: { ideal: CAMERA.height },
      facingMode: 'user',
    },
    audio: false,
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  // 等到有實際尺寸才回傳，避免後續計算長寬比得到 0
  if (!video.videoWidth) {
    await new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true }));
  }
  return stream;
}

export function stopCamera(stream, video) {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
  // 只清掉屬於自己的串流（StrictMode 重複掛載時，video 可能已換成新的串流）
  if (video && video.srcObject === stream) video.srcObject = null;
}

/** 把錯誤轉成使用者看得懂的說明 */
export function cameraErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
      return '相機權限被拒絕。請點網址列左側的鎖頭圖示，把「相機」改成允許，然後重新整理頁面。';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return '找不到可用的相機。請確認電腦有 webcam，或外接相機已經插好。';
    case 'NotReadableError':
      return '相機正被其他程式使用（例如視訊會議軟體）。請先關閉它再試一次。';
    default:
      return `無法開啟相機：${err?.message || err}`;
  }
}
