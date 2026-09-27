import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { ASSETS } from '../config.js';

// 以模組層級的 Promise 做成單例：React StrictMode 重複掛載也只會建立一次
let recognizerPromise = null;

async function modelUrl() {
  // 優先使用自行託管的模型，不存在時退回 Google 官方網址
  try {
    const res = await fetch(ASSETS.modelLocal, { method: 'HEAD' });
    const type = res.headers.get('content-type') || '';
    if (res.ok && !type.includes('text/html')) return ASSETS.modelLocal;
  } catch {
    /* 忽略，改用線上網址 */
  }
  return ASSETS.modelRemote;
}

async function create() {
  const vision = await FilesetResolver.forVisionTasks(ASSETS.wasmLocal);
  const modelAssetPath = await modelUrl();
  const options = (delegate) => ({
    baseOptions: { modelAssetPath, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
  });
  try {
    const r = await GestureRecognizer.createFromOptions(vision, options('GPU'));
    return { recognizer: r, delegate: 'GPU' };
  } catch (err) {
    console.warn('GPU delegate 失敗，改用 CPU', err);
    const r = await GestureRecognizer.createFromOptions(vision, options('CPU'));
    return { recognizer: r, delegate: 'CPU' };
  }
}

export function loadRecognizer() {
  if (!recognizerPromise) {
    recognizerPromise = create().catch((err) => {
      recognizerPromise = null; // 允許重試
      throw err;
    });
  }
  return recognizerPromise;
}
