// 復古濾鏡：輸入正方形照片（Image 或 Canvas），輸出同尺寸的 Canvas
// 像素風濾鏡先縮小處理再以最近鄰放大，做出大顆像素的效果

export const FILTERS = {
  original: { name: 'ORIGINAL' },
  onebit: { name: '1-BIT' },
  greenlcd: { name: 'GREEN LCD' },
  cga: { name: 'CGA 4' },
  vhs: { name: 'VHS' },
  dreamy: { name: 'DREAMY' },
};

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16 - 0.5)); // -0.5 … 0.5

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function sourceSize(src) {
  return src.naturalWidth || src.width;
}

/** 把來源縮到 small×small 後取像素 */
function downscale(src, small) {
  const c = makeCanvas(small);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(src, 0, 0, small, small);
  return { c, ctx, data: ctx.getImageData(0, 0, small, small) };
}

/** 最近鄰放大回原尺寸 */
function upscale(small, size) {
  const out = makeCanvas(size);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, size, size);
  return out;
}

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 1-bit：灰階 + Atkinson 誤差擴散抖色（早期黑白電腦的經典手法）
function onebit(src, size) {
  const S = Math.round(size / 2);
  const { c, ctx, data } = downscale(src, S);
  const d = data.data;
  const g = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    // 稍微拉高對比，人臉比較清楚
    g[i] = Math.min(255, Math.max(0, (luma(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) - 128) * 1.25 + 140));
  }
  const spread = [
    [1, 0],
    [2, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
    [0, 2],
  ];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const v = g[i] < 128 ? 0 : 255;
      const err = (g[i] - v) / 8;
      g[i] = v;
      for (const [dx, dy] of spread) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < S && yy < S) g[yy * S + xx] += err;
      }
    }
  }
  for (let i = 0; i < S * S; i++) {
    const v = g[i];
    d[i * 4] = v ? 244 : 30;
    d[i * 4 + 1] = v ? 240 : 24;
    d[i * 4 + 2] = v ? 232 : 36;
  }
  ctx.putImageData(data, 0, 0);
  return upscale(c, size);
}

// Green LCD：4 階綠色 + Bayer 規則抖色
function greenlcd(src, size) {
  const S = Math.round(size / 4);
  const pal = ['#0f380f', '#306230', '#8bac0f', '#c4d99a'].map(hex);
  const { c, ctx, data } = downscale(src, S);
  const d = data.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const v = luma(d[i], d[i + 1], d[i + 2]) / 255 + BAYER4[y % 4][x % 4] / 3;
      const k = Math.max(0, Math.min(3, Math.round(v * 3)));
      [d[i], d[i + 1], d[i + 2]] = pal[k];
    }
  }
  ctx.putImageData(data, 0, 0);
  return upscale(c, size);
}

// CGA 4：黑、青、洋紅、白四色 + 抖色
function cga(src, size) {
  const S = Math.round(size / 3);
  const pal = [
    [0, 0, 0],
    [85, 255, 255],
    [255, 85, 255],
    [255, 255, 255],
  ];
  const { c, ctx, data } = downscale(src, S);
  const d = data.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const o = BAYER4[y % 4][x % 4] * 110;
      const r = d[i] + o;
      const g = d[i + 1] + o;
      const b = d[i + 2] + o;
      let best = 0;
      let bestD = Infinity;
      pal.forEach((p, k) => {
        const dist = (r - p[0]) ** 2 * 0.3 + (g - p[1]) ** 2 * 0.59 + (b - p[2]) ** 2 * 0.11;
        if (dist < bestD) {
          bestD = dist;
          best = k;
        }
      });
      [d[i], d[i + 1], d[i + 2]] = pal[best];
    }
  }
  ctx.putImageData(data, 0, 0);
  return upscale(c, size);
}

// VHS：暖色偏移、紅色通道錯位、雜訊、掃描線
function vhs(src, size) {
  const out = makeCanvas(size);
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const copy = new Uint8ClampedArray(d);
  const shift = Math.round(size / 180); // 紅色通道向右錯位
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let y = 0; y < size; y++) {
    const scan = y % 4 === 0 ? 0.82 : 1;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const j = (y * size + Math.max(0, x - shift)) * 4;
      const n = (rand() - 0.5) * 26;
      const r = copy[j] * 1.08 + 12;
      const g = copy[i + 1] * 0.98 + 4;
      const b = copy[i + 2] * 0.85;
      d[i] = (r * 0.9 + 20 + n) * scan;
      d[i + 1] = (g * 0.9 + 14 + n) * scan;
      d[i + 2] = (b * 0.9 + 18 + n) * scan;
    }
  }
  ctx.putImageData(img, 0, 0);
  // 錄影帶時間碼
  ctx.font = `${Math.round(size / 16)}px "VT323", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 2;
  ctx.fillText('▶ PLAY', size * 0.05, size * 0.1);
  ctx.fillText('SP', size * 0.85, size * 0.1);
  return out;
}

// Dreamy：粉色調、提亮暗部、柔光暈
function dreamy(src, size) {
  const out = makeCanvas(size);
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] * 0.78 + 62;
    d[i + 1] = d[i + 1] * 0.74 + 44;
    d[i + 2] = d[i + 2] * 0.76 + 60;
  }
  ctx.putImageData(img, 0, 0);
  // 柔光：模糊後以 screen 疊回（瀏覽器不支援 ctx.filter 時略過）
  if ('filter' in ctx) {
    ctx.globalAlpha = 0.45;
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = `blur(${Math.round(size / 60)}px)`;
    ctx.drawImage(out, 0, 0);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  return out;
}

export function applyFilter(key, src, size = sourceSize(src)) {
  switch (key) {
    case 'onebit':
      return onebit(src, size);
    case 'greenlcd':
      return greenlcd(src, size);
    case 'cga':
      return cga(src, size);
    case 'vhs':
      return vhs(src, size);
    case 'dreamy':
      return dreamy(src, size);
    default: {
      const c = makeCanvas(size);
      c.getContext('2d').drawImage(src, 0, 0, size, size);
      return c;
    }
  }
}
