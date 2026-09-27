// 拍貼卡合成：4 種版型 × 8 種配色 × 6 種濾鏡
// 全部以程式繪製、沒有外部圖檔，因此不會汙染 canvas
import { IMAGE } from '../config.js';
import { FILTERS } from './filters.js';
import { dateStamp, formatTime, THEMES } from './image.js';

export const LAYOUTS = {
  classic: { name: '經典', icon: 'win1' },
  cascade: { name: '疊窗', icon: 'cascade' },
  notepad: { name: '記事本', icon: 'note' },
  photoexe: { name: '相片機', icon: 'tall' },
};

const W = IMAGE.cardWidth;
const H = IMAGE.cardHeight;
const MONO = '"VT323", monospace';
const SANS = '"Segoe UI", Tahoma, "Microsoft JhengHei", sans-serif';
const TAHOMA = 'Tahoma, "Segoe UI", sans-serif';

// ---------- 小工具 ----------

const PIXEL_HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
const PIXEL_STAR = ['0001000', '0001000', '1111111', '0111110', '0110110', '1100011'];
const PIXEL_SPARK = ['01010', '10101', '01110', '10101', '01010'];
const PIXEL_CAM = ['01110', '11111', '11011', '11111', '01110'];

function drawPixels(ctx, pattern, x, y, px, color) {
  ctx.fillStyle = color;
  pattern.forEach((row, r) => {
    [...row].forEach((c, col) => {
      if (c === '1') ctx.fillRect(x + col * px, y + r * px, px, px);
    });
  });
}

/** 字太寬時自動縮小字級 */
function fitText(ctx, text, x, y, maxWidth, size, family, weight = '') {
  let px = size;
  do {
    ctx.font = `${weight} ${px}px ${family}`;
    px -= 1;
  } while (ctx.measureText(text).width > maxWidth && px > 10);
  ctx.fillText(text, x, y);
}

/** 超過寬度就加刪節號 */
function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function box(ctx, x, y, w, h, color, fill, lw = 3) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
}

function hgrad(ctx, x, w, a, b) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

function vgrad(ctx, y, h, a, b) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

/** 以 cover 方式把正方形照片畫進任意矩形，可放大並指定焦點 */
function cover(ctx, img, x, y, w, h, zoom = 1, fx = 0.5, fy = 0.5) {
  const S = img.width;
  const base = S / zoom;
  const sw = w >= h ? base : (base * w) / h;
  const sh = w >= h ? (base * h) / w : base;
  const sx = Math.min(S - sw, Math.max(0, fx * S - sw / 2));
  const sy = Math.min(S - sh, Math.max(0, fy * S - sh / 2));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function stamp(ctx, right, bottom, size = 52) {
  ctx.save();
  ctx.font = `${size}px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(255,120,0,0.9)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffb347';
  ctx.fillText(dateStamp(), right, bottom);
  ctx.restore();
}

function statLine(stats) {
  return `${stats.n}x${stats.n} PUZZLE  ♥  ${stats.moves} MOVES (BEST ${stats.best})  ♥  ${formatTime(stats.timeMs)}`;
}

function background(ctx, t) {
  ctx.fillStyle = hgrad(ctx, 0, W, t.bg[0], t.bg[1]);
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, t.bg[0]);
  g.addColorStop(1, t.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  [
    [150, 200, 260],
    [760, 420, 300],
    [300, 950, 280],
  ].forEach(([cx, cy, r]) => {
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.45)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  });
}

// ---------- 視窗外觀 1：粉彩雙線框 ----------

function titleButtonsPastel(ctx, t, right, y) {
  ['_', 'box', 'x'].forEach((kind, i) => {
    const bx = right - (3 - i) * 42;
    box(ctx, bx, y, 36, 34, t.line, t.panel, 2);
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (kind === '_') {
      ctx.moveTo(bx + 10, y + 25);
      ctx.lineTo(bx + 26, y + 25);
    } else if (kind === 'box') {
      ctx.rect(bx + 10, y + 9, 16, 16);
    } else {
      ctx.moveTo(bx + 10, y + 9);
      ctx.lineTo(bx + 26, y + 25);
      ctx.moveTo(bx + 26, y + 9);
      ctx.lineTo(bx + 10, y + 25);
    }
    ctx.stroke();
  });
}

// ---------- 視窗外觀 2：立體灰框（Win9x 風） ----------

function bevelRect(ctx, x, y, w, h, { inset = false, face, light = '#ffffff', dark, lw = 3 }) {
  if (face) {
    ctx.fillStyle = face;
    ctx.fillRect(x, y, w, h);
  }
  ctx.fillStyle = inset ? dark : light;
  ctx.fillRect(x, y, w, lw);
  ctx.fillRect(x, y, lw, h);
  ctx.fillStyle = inset ? light : dark;
  ctx.fillRect(x, y + h - lw, w, lw);
  ctx.fillRect(x + w - lw, y, lw, h);
}

function bevelColors(t) {
  return { face: t.panel, dark: t.key === 'chrome' ? '#5a5a5a' : t.line, ink: t.key === 'chrome' ? '#111' : t.line };
}

function bevelButtons(ctx, t, right, y) {
  const c = bevelColors(t);
  ['_', 'box', 'x'].forEach((kind, i) => {
    const bx = right - (3 - i) * 36 + (i === 2 ? 4 : 0);
    bevelRect(ctx, bx, y, 32, 28, { face: c.face, dark: c.dark, lw: 2 });
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (kind === '_') {
      ctx.moveTo(bx + 9, y + 20);
      ctx.lineTo(bx + 21, y + 20);
    } else if (kind === 'box') {
      ctx.rect(bx + 9, y + 7, 14, 13);
    } else {
      ctx.moveTo(bx + 9, y + 7);
      ctx.lineTo(bx + 23, y + 21);
      ctx.moveTo(bx + 23, y + 7);
      ctx.lineTo(bx + 9, y + 21);
    }
    ctx.stroke();
  });
}

function hScrollbar(ctx, t, x, y, w, thumbAt = 0.08) {
  const c = bevelColors(t);
  ctx.fillStyle = c.face;
  ctx.fillRect(x, y, w, 26);
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < w; i += 4) {
    for (let j = (i / 4) % 2 ? 0 : 2; j < 26; j += 4) {
      ctx.fillStyle = c.dark;
      ctx.fillRect(x + i, y + j, 2, 2);
    }
  }
  ctx.globalAlpha = 1;
  [x, x + w - 26].forEach((bx, i) => {
    bevelRect(ctx, bx, y, 26, 26, { face: c.face, dark: c.dark, lw: 2 });
    ctx.fillStyle = c.ink;
    ctx.beginPath();
    if (i === 0) {
      ctx.moveTo(bx + 16, y + 7);
      ctx.lineTo(bx + 9, y + 13);
      ctx.lineTo(bx + 16, y + 19);
    } else {
      ctx.moveTo(bx + 10, y + 7);
      ctx.lineTo(bx + 17, y + 13);
      ctx.lineTo(bx + 10, y + 19);
    }
    ctx.fill();
  });
  bevelRect(ctx, x + 26 + (w - 52) * thumbAt, y, (w - 52) * 0.3, 26, { face: c.face, dark: c.dark, lw: 2 });
}

/** 立體灰框視窗（無標題文字），回傳照片區 */
function bevelWindow(ctx, t, x, y, w, h, thumbAt) {
  const c = bevelColors(t);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = c.face;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  bevelRect(ctx, x, y, w, h, { face: c.face, dark: c.dark, lw: 4 });
  bevelButtons(ctx, t, x + w - 14, y + 12);
  const well = { x: x + 16, y: y + 50, w: w - 32, h: h - 50 - 16 - 28 };
  bevelRect(ctx, well.x - 4, well.y - 4, well.w + 8, well.h + 8, { inset: true, dark: c.dark, lw: 4 });
  hScrollbar(ctx, t, well.x - 4, well.y + well.h + 6, well.w + 8, thumbAt);
  return well;
}

// ---------- 視窗外觀 3：粉色記事本（Aero 風） ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function aeroWindow(ctx, t, x, y, w, h, title) {
  // 外框
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = vgrad(ctx, y, h, '#fff4f8', t.swatch);
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, 10);
  ctx.strokeStyle = 'rgba(120,60,80,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 玻璃反光
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(x + 4, y + 4, w - 8, 18);

  // 圖示 + 標題
  ctx.fillStyle = vgrad(ctx, y + 12, 26, '#d8f3ff', '#7fc4e3');
  ctx.fillRect(x + 14, y + 12, 22, 26);
  ctx.strokeStyle = '#5a8fa8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 14.5, y + 12.5, 21, 25);
  ctx.fillStyle = '#2b2b2b';
  ctx.font = `24px ${SANS}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(ellipsize(ctx, title, w - 260), x + 46, y + 26);

  // 最小化 / 最大化 / 關閉
  const by = y + 2;
  const right = x + w - 12;
  const close = { x: right - 62, w: 62 };
  [
    { x: close.x - 84, w: 40, kind: 'min' },
    { x: close.x - 42, w: 40, kind: 'max' },
  ].forEach((b) => {
    roundRect(ctx, b.x, by, b.w, 26, 4);
    ctx.fillStyle = vgrad(ctx, by, 26, '#ffffff', t.swatch);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,40,60,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (b.kind === 'min') {
      ctx.moveTo(b.x + 13, by + 17);
      ctx.lineTo(b.x + 27, by + 17);
    } else {
      ctx.rect(b.x + 13, by + 7, 14, 12);
    }
    ctx.stroke();
  });
  roundRect(ctx, close.x, by, close.w, 26, 4);
  ctx.fillStyle = vgrad(ctx, by, 26, '#f29a86', '#c8392b');
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,20,20,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(close.x + 24, by + 7);
  ctx.lineTo(close.x + 38, by + 19);
  ctx.moveTo(close.x + 38, by + 7);
  ctx.lineTo(close.x + 24, by + 19);
  ctx.stroke();

  // 選單列
  const my = y + 46;
  ctx.fillStyle = vgrad(ctx, my, 34, '#ffffff', '#eaeef8');
  ctx.fillRect(x + 8, my, w - 16, 34);
  ctx.fillStyle = '#222';
  ctx.font = `20px ${SANS}`;
  let mx = x + 20;
  ['File', 'Edit', 'Format', 'View', 'Help'].forEach((m) => {
    ctx.fillText(m, mx, my + 18);
    mx += ctx.measureText(m).width + 26;
  });

  // 內容區 + 垂直捲軸
  const cy = my + 36;
  const ch = h - (cy - y) - 8;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 8, cy, w - 16, ch);
  ctx.strokeStyle = '#a9a9b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 8.5, cy + 0.5, w - 17, ch - 1);
  const sx = x + w - 8 - 24;
  ctx.fillStyle = '#f0f0f3';
  ctx.fillRect(sx, cy + 1, 23, ch - 2);
  ctx.fillStyle = '#9a9aa8';
  [
    [cy + 10, 1],
    [cy + ch - 10, -1],
  ].forEach(([ay, dir]) => {
    ctx.beginPath();
    ctx.moveTo(sx + 6, ay + 4 * dir);
    ctx.lineTo(sx + 12, ay - 3 * dir);
    ctx.lineTo(sx + 18, ay + 4 * dir);
    ctx.fill();
  });
  return { x: x + 9, y: cy + 1, w: w - 16 - 26, h: ch - 2 };
}

// ---------- 版型 ----------

function drawClassic(ctx, t, { photo, stats }) {
  const ink = t.text ?? t.line;
  const wx = 40;
  const wy = 40;
  const ww = W - 80;
  const wh = 940;
  // 雙線外框
  ctx.fillStyle = t.panel;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 4;
  ctx.strokeRect(wx + 2, wy + 2, ww - 4, wh - 4);
  ctx.lineWidth = 2;
  ctx.strokeRect(wx + 9, wy + 9, ww - 18, wh - 18);

  // 標題列
  const tx = wx + 14;
  const ty = wy + 14;
  const tw = ww - 28;
  const th = 50;
  box(ctx, tx, ty, tw, th, t.line, hgrad(ctx, tx, tw, t.title[0], t.title[1]));
  drawPixels(ctx, PIXEL_CAM, tx + 16, ty + 14, 4, t.titleText ?? t.line);
  ctx.fillStyle = t.titleText ?? t.line;
  ctx.font = `40px ${MONO}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Pixpiece.exe', tx + 48, ty + th / 2 + 2);
  titleButtonsPastel(ctx, t, tx + tw - 12 + 42 * 0, ty + 8);

  // 選單列
  ctx.fillStyle = ink;
  ctx.font = `30px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  let mx = tx + 8;
  ['File', 'Edit', 'View', 'Photo', 'Help'].forEach((m) => {
    ctx.fillText(m, mx, ty + th + 34);
    ctx.fillRect(mx, ty + th + 38, ctx.measureText(m[0]).width, 2);
    mx += ctx.measureText(m).width + 22;
  });

  // 照片
  const ps = 720;
  const px = (W - ps) / 2;
  const py = 162;
  box(ctx, px - 8, py - 8, ps + 16, ps + 16, t.line, '#ffffff', 4);
  cover(ctx, photo, px, py, ps, ps);
  stamp(ctx, px + ps - 20, py + ps - 20);

  // 狀態欄
  const sy = py + ps + 18;
  box(ctx, px - 8, sy, ps + 16, 50, t.line, t.panel, 3);
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  fitText(ctx, statLine(stats), px + 10, sy + 27, ps - 20, 34, MONO);

  // 標語與貼紙
  ctx.textAlign = 'center';
  fitText(ctx, 'Say cheese, piece by piece', W / 2, wy + wh + 46, 600, 46, MONO);
  ctx.font = `26px ${MONO}`;
  ctx.fillText('made with pixpiece.exe  ·  no photos were uploaded', W / 2, wy + wh + 92);
  ctx.textAlign = 'left';
  drawPixels(ctx, PIXEL_HEART, 70, 1002, 7, t.accent);
  drawPixels(ctx, PIXEL_STAR, W - 120, 1004, 7, t.accent);
  drawPixels(ctx, PIXEL_SPARK, px + 20, py + 20, 8, '#ffffff');
  drawPixels(ctx, PIXEL_HEART, px + ps - 86, py + 22, 8, t.accent);
}

function drawCascade(ctx, t, { photo, stats }) {
  const ink = t.text ?? t.line;
  // 右上角標語
  ctx.fillStyle = ink;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  fitText(ctx, 'Say cheese,', 860, 104, 290, 50, MONO);
  fitText(ctx, 'piece by piece', 860, 146, 290, 40, MONO);
  ctx.textAlign = 'left';
  drawPixels(ctx, PIXEL_HEART, 800, 166, 7, t.accent);

  // 三個重疊視窗：後面兩個放特寫，前面放完整照片
  const a = bevelWindow(ctx, t, 40, 40, 500, 560, 0.05);
  cover(ctx, photo, a.x, a.y, a.w, a.h, 1.9, 0.5, 0.42);
  const b = bevelWindow(ctx, t, 360, 230, 500, 540, 0.55);
  cover(ctx, photo, b.x, b.y, b.w, b.h, 1.45, 0.58, 0.6);
  const c = bevelWindow(ctx, t, 70, 420, 580, 640, 0.1);
  cover(ctx, photo, c.x, c.y, c.w, c.h);
  stamp(ctx, c.x + c.w - 18, c.y + c.h - 18, 48);
  drawPixels(ctx, PIXEL_SPARK, c.x + 18, c.y + 18, 7, '#ffffff');

  // 右下角成績（放在前方視窗右側的空白處）
  ctx.fillStyle = ink;
  ctx.textAlign = 'right';
  ctx.font = `34px ${MONO}`;
  [`${stats.n}x${stats.n} PUZZLE`, `${stats.moves} MOVES`, `BEST ${stats.best}`, formatTime(stats.timeMs)].forEach((l, i) =>
    ctx.fillText(l, 866, 864 + i * 40),
  );
  ctx.textAlign = 'left';
  drawPixels(ctx, PIXEL_STAR, 810, 1030, 6, t.accent);
}

function drawNotepad(ctx, t, { photo, stats, caption }) {
  const ink = t.text ?? t.line;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  fitText(ctx, '♥ Say cheese, piece by piece ♥', W / 2, 72, 780, 48, MONO);
  ctx.textAlign = 'left';

  // 後面：記事本寫著今天的成績
  const note = aeroWindow(ctx, t, 40, 110, 540, 470, 'memo.txt - Notepad');
  const d = new Date();
  const lines = [
    '♥ pixpiece.exe · 像素拼 ♥',
    `date:   ${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
    `puzzle: ${stats.n}x${stats.n} cleared!`,
    `moves:  ${stats.moves} (best ${stats.best})`,
    `time:   ${formatTime(stats.timeMs)}`,
    'mood:   very y2k :)',
  ];
  ctx.fillStyle = '#2a2a2a';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((l, i) => fitText(ctx, l, note.x + 16, note.y + 38 + i * 36, note.w - 30, 24, '"Consolas", "Courier New", monospace'));
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(note.x + 16, note.y + 38 + lines.length * 36 - 22, 2, 26); // 游標

  // 前面：自訂標題 + 照片
  const front = aeroWindow(ctx, t, 270, 430, 592, 640, caption || 'my y2k selfie - Notepad');
  cover(ctx, photo, front.x, front.y, front.w, front.h);
  stamp(ctx, front.x + front.w - 18, front.y + front.h - 18, 48);
  drawPixels(ctx, PIXEL_HEART, 60, 640, 8, t.accent);
  drawPixels(ctx, PIXEL_SPARK, 170, 700, 7, t.accent);
}

function drawPhotoExe(ctx, t, { photo, stats, filterKey, filtered }) {
  const c = bevelColors(t);
  const x = 140;
  const y = 22;
  const w = 620;
  const h = 1046;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = c.face;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  bevelRect(ctx, x, y, w, h, { face: c.face, dark: c.dark, lw: 4 });

  // 標題列（漸層）
  ctx.fillStyle = hgrad(ctx, x + 8, w - 16, t.title[0], t.title[1]);
  ctx.fillRect(x + 8, y + 8, w - 16, 40);
  drawPixels(ctx, PIXEL_CAM, x + 18, y + 18, 4, t.titleText ?? '#ffffff');
  ctx.fillStyle = t.titleText ?? '#ffffff';
  ctx.font = `bold 26px ${TAHOMA}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Photo.exe', x + 50, y + 29);
  bevelButtons(ctx, t, x + w - 14, y + 14);

  // 選單
  ctx.fillStyle = c.ink;
  ctx.font = `22px ${TAHOMA}`;
  ctx.textBaseline = 'alphabetic';
  let mx = x + 18;
  ['File', 'Edit', 'View', 'Options', 'Help'].forEach((m) => {
    ctx.fillText(m, mx, y + 80);
    ctx.fillRect(mx, y + 83, ctx.measureText(m[0]).width, 2);
    mx += ctx.measureText(m).width + 24;
  });

  // Back / 亮度 / Next
  const ty = y + 96;
  [
    [x + 24, 'Back'],
    [x + w - 24 - 130, 'Next'],
  ].forEach(([bx, label]) => {
    bevelRect(ctx, bx, ty, 130, 46, { face: c.face, dark: c.dark, lw: 3 });
    ctx.fillStyle = c.ink;
    ctx.font = `24px ${TAHOMA}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + 65, ty + 24);
    ctx.textAlign = 'left';
  });
  const sx = x + w / 2;
  const sy = ty + 23;
  ctx.strokeStyle = c.ink;
  ctx.fillStyle = c.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, 11, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * 16, sy + Math.sin(a) * 16);
    ctx.lineTo(sx + Math.cos(a) * 22, sy + Math.sin(a) * 22);
    ctx.stroke();
  }

  // 照片
  const px = x + 30;
  const py = ty + 62;
  const ps = 560;
  bevelRect(ctx, px - 5, py - 5, ps + 10, ps + 10, { inset: true, dark: c.dark, face: '#000', lw: 4 });
  cover(ctx, photo, px, py, ps, ps);
  stamp(ctx, px + ps - 16, py + ps - 16, 46);

  // 濾鏡列
  const fx = x + 24;
  const fy = py + ps + 18;
  const fw = w - 48;
  const fh = 210;
  bevelRect(ctx, fx, fy, fw, fh, { inset: true, dark: c.dark, face: c.face, lw: 3 });
  const keys = Object.keys(FILTERS);
  const cur = keys.indexOf(filterKey);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx + 3, fy + 3, fw - 6, fh - 6);
  ctx.clip();
  const slot = 150;
  const center = fx + fw / 2;
  for (let k = -2; k <= 2; k++) {
    const key = keys[(cur + k + keys.length) % keys.length];
    const cx = center + k * slot;
    const tw = 120;
    ctx.fillStyle = c.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${k === 0 ? 'bold ' : ''}20px ${TAHOMA}`;
    ctx.fillText(FILTERS[key].name, cx, fy + 34);
    const thumb = filtered?.[key];
    const tx = cx - tw / 2;
    const tyy = fy + 46;
    if (thumb) cover(ctx, thumb, tx, tyy, tw, tw);
    else {
      ctx.fillStyle = '#000';
      ctx.fillRect(tx, tyy, tw, tw);
    }
    if (k === 0) {
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(tx - 4, tyy - 4, tw + 8, tw + 8);
    }
  }
  ctx.restore();
  ctx.textAlign = 'left';
  hScrollbar(ctx, t, fx + 6, fy + fh - 34, fw - 12, cur / keys.length);

  // Filter / Edit 分頁
  const tabY = fy + fh + 10;
  const tabW = (w - 48) / 2;
  bevelRect(ctx, x + 24, tabY, tabW, 50, { inset: true, dark: c.dark, face: c.face, lw: 3 });
  bevelRect(ctx, x + 24 + tabW, tabY, tabW, 50, { face: c.face, dark: c.dark, lw: 3 });
  ctx.fillStyle = c.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 24px ${TAHOMA}`;
  ctx.fillText('Filter', x + 24 + tabW / 2, tabY + 26);
  ctx.font = `24px ${TAHOMA}`;
  ctx.fillText('Edit', x + 24 + tabW * 1.5, tabY + 26);

  // 卡片底部成績
  ctx.fillStyle = t.text ?? t.line;
  ctx.font = `28px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(statLine(stats), W / 2, H - 8);
  ctx.textAlign = 'left';
  drawPixels(ctx, PIXEL_HEART, 40, 60, 8, t.accent);
  drawPixels(ctx, PIXEL_STAR, W - 100, 980, 8, t.accent);
}

const DRAW = {
  classic: drawClassic,
  cascade: drawCascade,
  notepad: drawNotepad,
  photoexe: drawPhotoExe,
};

/**
 * 合成拍貼卡
 * opts = { layout, themeKey, filterKey, filtered: {key: canvas}, stats, caption }
 */
export async function composeCard({ layout = 'classic', themeKey, filterKey = 'original', filtered, stats, caption }) {
  const t = { key: themeKey, ...(THEMES[themeKey] ?? THEMES.sakura) };
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  try {
    await document.fonts.load(`48px ${MONO}`);
  } catch {
    /* 沒有網路字型也可以繼續 */
  }
  background(ctx, t);
  const photo = filtered[filterKey] ?? filtered.original;
  (DRAW[layout] ?? drawClassic)(ctx, t, { photo, stats, caption, filterKey, filtered });
  return canvas;
}
