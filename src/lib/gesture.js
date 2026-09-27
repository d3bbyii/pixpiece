import { GESTURE } from '../config.js';

// ---------- 單幀判斷 ----------

const WRIST = 0;
const FINGERS = {
  index: { pip: 6, tip: 8 },
  middle: { pip: 10, tip: 12 },
  ring: { pip: 14, tip: 16 },
  pinky: { pip: 18, tip: 20 },
};

function dist(a, b, aspect) {
  // landmark 的 x、y 都正規化到 0–1，x 要乘上畫面長寬比才是真實比例
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

function extendRatio(lm, finger, aspect) {
  const { pip, tip } = FINGERS[finger];
  return dist(lm[tip], lm[WRIST], aspect) / (dist(lm[pip], lm[WRIST], aspect) || 1e-6);
}

/** 幾何備援判斷：食指、中指伸直，無名指、小指彎曲 */
export function isVictoryGeometry(landmarks, aspect = 16 / 9, ratio = GESTURE.extendRatio) {
  if (!landmarks || landmarks.length < 21) return false;
  const r = (f) => extendRatio(landmarks, f, aspect);
  return r('index') > ratio && r('middle') > ratio && r('ring') < ratio && r('pinky') < ratio;
}

/**
 * 把 GestureRecognizer 的輸出轉成「這一幀有沒有 YA / 張開手掌」
 * 回傳 { ya, palm, score, label, source, hasHand }
 */
export function classifyFrame(result, aspect) {
  const top = result?.gestures?.[0]?.[0];
  const label = top?.categoryName ?? 'None';
  const score = top?.score ?? 0;
  const lm = result?.landmarks?.[0];
  const hasHand = !!lm;
  const palm = label === 'Open_Palm' && score >= GESTURE.scoreThreshold;
  if (label === 'Victory' && score >= GESTURE.scoreThreshold) {
    return { ya: true, palm: false, score, label, source: 'model', hasHand };
  }
  if (!palm && lm && isVictoryGeometry(lm, aspect)) {
    return { ya: true, palm: false, score, label, source: 'geometry', hasHand };
  }
  return { ya: false, palm, score, label, source: null, hasHand };
}

// ---------- 觸發狀態機（純邏輯，時間由外部傳入） ----------

/**
 * 建立觸發器。每幀呼叫 step(now, ya, palm)，回傳：
 *  { state: 'idle' | 'arming' | 'counting' | 'fire', remainingMs, armProgress, cancelled }
 * - idle：等待手勢（或冷卻中）
 * - arming：YA 已出現，累積穩定時間中
 * - counting：倒數中。YA 只負責啟動，倒數期間可以自由換姿勢；
 *             張開手掌持續 cancelHoldMs 才會取消
 * - fire：倒數結束（只回傳一次），外部應拍照
 */
export function createTrigger(cfg = GESTURE) {
  let stableSince = null;
  let countdownStart = null;
  let palmSince = null;
  let cooldownUntil = 0;

  return {
    reset(now = 0) {
      stableSince = null;
      countdownStart = null;
      palmSince = null;
      cooldownUntil = now + cfg.cooldownMs;
    },
    step(now, ya, palm = false) {
      if (countdownStart !== null) {
        palmSince = palm ? (palmSince ?? now) : null;
        if (palmSince !== null && now - palmSince >= cfg.cancelHoldMs) {
          // 張開手掌夠久 → 取消倒數，並冷卻一下避免馬上又被 YA 觸發
          countdownStart = null;
          stableSince = null;
          palmSince = null;
          cooldownUntil = now + cfg.cooldownMs;
          return { state: 'idle', cancelled: true };
        }
        const remainingMs = cfg.countdownMs - (now - countdownStart);
        if (remainingMs <= 0) {
          countdownStart = null;
          stableSince = null;
          cooldownUntil = now + cfg.cooldownMs;
          return { state: 'fire' };
        }
        return { state: 'counting', remainingMs };
      }

      if (now < cooldownUntil || !ya) {
        stableSince = null;
        return { state: 'idle' };
      }
      if (stableSince === null) stableSince = now;
      const held = now - stableSince;
      if (held >= cfg.triggerHoldMs) {
        countdownStart = now;
        palmSince = null;
        return { state: 'counting', remainingMs: cfg.countdownMs };
      }
      return { state: 'arming', armProgress: held / cfg.triggerHoldMs };
    },
  };
}
