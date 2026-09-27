import { IMAGE } from '../config.js';

/**
 * 從 video 擷取「與預覽一致」的畫面：中央正方形 + 左右鏡像
 * 回傳 JPEG data URL（作為拼圖圖片）
 */
export function captureSquare(video, size = IMAGE.photoSize) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.translate(size, 0);
  ctx.scale(-1, 1); // 鏡像，與使用者看到的預覽相同
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.92);
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ---------- 圖框配色 ----------

// 色盤上的每個顏色就是一款圖框
// bg: 背景漸層、panel: 視窗底色、title: 標題列漸層、line: 描邊與文字、accent: 貼紙
export const THEMES = {
  sakura: { name: 'Sakura', swatch: '#f7b6cd', bg: ['#ffd9e6', '#e9d6ff'], panel: '#fde6ef', title: ['#b8bdf5', '#d9c9ff'], line: '#b0455a', accent: '#e8577e' },
  lavender: { name: 'Lavender', swatch: '#c9b3f2', bg: ['#e6dcff', '#cfd8ff'], panel: '#f1ebff', title: ['#c9b8f5', '#b8d0f5'], line: '#6b4aa0', accent: '#9a6ee0' },
  sky: { name: 'Sky', swatch: '#9fc9f5', bg: ['#d4ecff', '#e8e0ff'], panel: '#eef6ff', title: ['#9fc9f5', '#c3b8f5'], line: '#3a5a9e', accent: '#5a8ae0' },
  mint: { name: 'Mint', swatch: '#a8e6cf', bg: ['#d6f5e6', '#e3f0ff'], panel: '#eefaf4', title: ['#a8e6cf', '#b8e0f5'], line: '#2f7a64', accent: '#3fb58f' },
  lemon: { name: 'Lemon', swatch: '#ffe98a', bg: ['#fff6c7', '#ffe0ec'], panel: '#fffbe8', title: ['#ffe98a', '#ffc2d9'], line: '#9a6b1f', accent: '#f0a830' },
  peach: { name: 'Peach', swatch: '#ffc2a8', bg: ['#ffe0cc', '#ffd6e0'], panel: '#fff0e8', title: ['#ffc2a8', '#ffb3c6'], line: '#b0553f', accent: '#f07a5a' },
  chrome: { name: 'Chrome', swatch: '#c0c0c0', bg: ['#f2f4f7', '#c9d0db'], panel: '#dcdcdc', title: ['#0a246a', '#a6caf0'], line: '#1c2a44', titleText: '#ffffff', accent: '#1f4fd1' },
  cyber: { name: 'Cyber', swatch: '#3a1d6e', bg: ['#1b1142', '#3a1d6e'], panel: '#241657', title: ['#00c2a8', '#ff4fd8'], line: '#00ffd5', titleText: '#ffffff', text: '#e9e3ff', accent: '#ff4fd8' },
};

function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

export function dateStamp(d = new Date()) {
  return `'${String(d.getFullYear()).slice(2)} ${pad(d.getMonth() + 1)} ${pad(d.getDate())}`;
}

/**
 * 儲存拍貼。
 * 手機 / 平板：優先開啟系統分享選單（可直接「儲存影像」到相簿）
 * 電腦或不支援分享時：一般檔案下載
 * 回傳 'shared' | 'download' | 'cancelled'
 */
export async function downloadCanvas(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const d = new Date();
  const name = `pixpiece-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Pixpiece.exe' });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'; // 使用者關掉分享選單
      // 其他錯誤：改用一般下載
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'download';
}
