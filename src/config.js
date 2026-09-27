// 所有可調參數集中在這裡，方便測試時調整（對應說明書第五節）
export const GESTURE = {
  scoreThreshold: 0.6, // Victory 分數門檻
  triggerHoldMs: 300, // YA 需穩定多久才開始倒數
  countdownMs: 3000, // 倒數長度
  cancelHoldMs: 300, // 倒數中張開手掌多久才取消（倒數期間可以自由換姿勢）
  cooldownMs: 1500, // 回到 live 後的冷卻時間
  extendRatio: 1.1, // 幾何判斷：指尖到手腕 / PIP 到手腕 > 此值視為伸直
};

export const CAMERA = {
  width: 1280,
  height: 720,
};

export const IMAGE = {
  photoSize: 720, // 擷取後的正方形照片邊長
  cardWidth: 900, // 匯出拍貼寬
  cardHeight: 1100, // 匯出拍貼高
};

export const ASSETS = {
  wasmLocal: '/mediapipe/wasm',
  modelLocal: '/models/gesture_recognizer.task',
  modelRemote:
    'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
};

export const DIFFICULTIES = [3, 4];
