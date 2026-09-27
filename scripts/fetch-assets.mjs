// 把 MediaPipe 的 WASM 與手勢模型放進 public/，讓網站自行託管、不依賴第三方 CDN。
// 會在 npm run dev / npm run build 前自動執行；檔案已存在就略過。
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasmSrc = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const wasmDst = join(root, 'public/mediapipe/wasm');
const modelDst = join(root, 'public/models/gesture_recognizer.task');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

// 1. WASM：從 node_modules 複製（版本必定與 JS 套件一致）
if (existsSync(wasmSrc)) {
  mkdirSync(wasmDst, { recursive: true });
  cpSync(wasmSrc, wasmDst, { recursive: true });
  console.log('[fetch-assets] WASM 已複製到 public/mediapipe/wasm');
} else {
  console.warn('[fetch-assets] 找不到 node_modules 內的 WASM，請先執行 npm install');
}

// 2. 模型：下載一次
if (existsSync(modelDst)) {
  console.log('[fetch-assets] 模型已存在，略過下載');
} else {
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(modelDst), { recursive: true });
    writeFileSync(modelDst, buf);
    console.log(`[fetch-assets] 模型已下載（${(buf.length / 1e6).toFixed(1)} MB）`);
  } catch (err) {
    // 下載失敗不阻擋建置：執行時會自動改從 Google 官方網址載入
    console.warn(`[fetch-assets] 模型下載失敗（${err.message}），執行時將改用線上網址`);
  }
}
