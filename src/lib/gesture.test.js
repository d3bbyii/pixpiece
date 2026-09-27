import { describe, expect, it } from 'vitest';
import { classifyFrame, createTrigger, isVictoryGeometry } from './gesture.js';

const cfg = {
  triggerHoldMs: 300,
  countdownMs: 3000,
  cancelHoldMs: 300,
  cooldownMs: 1500,
};

// 以固定 33 ms（約 30 FPS）模擬，yaAt / palmAt 決定每幀偵測到的手勢
function run(yaAt, until, palmAt = () => false) {
  const t = createTrigger(cfg);
  const log = [];
  for (let now = 0; now <= until; now += 33) {
    const r = t.step(now, yaAt(now), palmAt(now));
    log.push({ now, ...r });
    if (r.state === 'fire') break;
  }
  return log;
}

describe('trigger', () => {
  it('持續比 YA → 約 3.3 秒後拍照', () => {
    const log = run(() => true, 5000);
    const fire = log.find((l) => l.state === 'fire');
    expect(fire).toBeTruthy();
    expect(fire.now).toBeGreaterThanOrEqual(3300);
    expect(fire.now).toBeLessThan(3400);
  });

  it('短暫揮過（< 300 ms）不會開始倒數', () => {
    const log = run((now) => now < 200, 3000);
    expect(log.some((l) => l.state === 'counting')).toBe(false);
  });

  it('倒數開始後放下手、換姿勢，仍會拍照', () => {
    const log = run((now) => now < 500, 5000);
    expect(log.some((l) => l.cancelled)).toBe(false);
    expect(log.at(-1).state).toBe('fire');
  });

  it('倒數中張開手掌 300 ms → 取消', () => {
    const log = run((now) => now < 500, 5000, (now) => now > 1500);
    expect(log.some((l) => l.cancelled)).toBe(true);
    expect(log.some((l) => l.state === 'fire')).toBe(false);
  });

  it('手掌只閃過 150 ms 不會取消', () => {
    const log = run((now) => now < 500, 5000, (now) => now > 1500 && now < 1650);
    expect(log.some((l) => l.cancelled)).toBe(false);
    expect(log.at(-1).state).toBe('fire');
  });

  it('reset 後冷卻期間不會觸發', () => {
    const t = createTrigger(cfg);
    t.reset(0);
    for (let now = 0; now < 1500; now += 33) {
      expect(t.step(now, true).state).toBe('idle');
    }
  });
});

// 合成手部特徵點：wrist 在下方，指定哪些手指伸直
function hand(extended) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9, z: 0 }));
  const fingers = { index: [6, 8, 0.44], middle: [10, 12, 0.5], ring: [14, 16, 0.56], pinky: [18, 20, 0.62] };
  for (const [name, [pip, tip, x]] of Object.entries(fingers)) {
    lm[pip] = { x, y: 0.6, z: 0 };
    lm[tip] = { x, y: extended.includes(name) ? 0.4 : 0.72, z: 0 };
  }
  return lm;
}

describe('geometry', () => {
  it('食指 + 中指伸直 → YA', () => {
    expect(isVictoryGeometry(hand(['index', 'middle']))).toBe(true);
  });
  it('張開手掌、握拳、比 1 都不是 YA', () => {
    expect(isVictoryGeometry(hand(['index', 'middle', 'ring', 'pinky']))).toBe(false);
    expect(isVictoryGeometry(hand([]))).toBe(false);
    expect(isVictoryGeometry(hand(['index']))).toBe(false);
  });
  it('模型分數低於門檻時改用幾何判斷', () => {
    const res = { gestures: [[{ categoryName: 'Victory', score: 0.3 }]], landmarks: [hand(['index', 'middle'])] };
    expect(classifyFrame(res, 16 / 9).source).toBe('geometry');
    const res2 = { gestures: [[{ categoryName: 'Victory', score: 0.9 }]], landmarks: [hand([])] };
    expect(classifyFrame(res2, 16 / 9).source).toBe('model');
  });
  it('張開手掌判定為 palm，不會被幾何判斷誤認成 YA', () => {
    const res = { gestures: [[{ categoryName: 'Open_Palm', score: 0.85 }]], landmarks: [hand(['index', 'middle'])] };
    const c = classifyFrame(res, 16 / 9);
    expect(c.palm).toBe(true);
    expect(c.ya).toBe(false);
  });
});
