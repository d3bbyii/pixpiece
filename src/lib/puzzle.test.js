import { describe, expect, it } from 'vitest';
import {
  correctCount,
  fisherYates,
  isSolved,
  minSwaps,
  newGame,
  solvedBoard,
  swap,
} from './puzzle.js';

// 暴力 BFS：用來驗證 minSwaps 的正確性
function bfsMinSwaps(board) {
  const target = board.slice().sort((a, b) => a - b).join(',');
  const start = board.join(',');
  if (start === target) return 0;
  const seen = new Set([start]);
  let frontier = [board];
  for (let depth = 1; frontier.length; depth++) {
    const next = [];
    for (const b of frontier) {
      for (let i = 0; i < b.length; i++) {
        for (let j = i + 1; j < b.length; j++) {
          const c = swap(b, i, j);
          const key = c.join(',');
          if (key === target) return depth;
          if (!seen.has(key)) {
            seen.add(key);
            next.push(c);
          }
        }
      }
    }
    frontier = next;
  }
  return -1;
}

describe('puzzle', () => {
  it('solvedBoard 已完成', () => {
    expect(isSolved(solvedBoard(3))).toBe(true);
    expect(isSolved(solvedBoard(4))).toBe(true);
  });

  it('newGame 產生 0…N²−1 的排列，且不是已完成狀態', () => {
    for (const n of [3, 4]) {
      for (let t = 0; t < 500; t++) {
        const b = newGame(n);
        expect(b.slice().sort((x, y) => x - y)).toEqual(solvedBoard(n));
        expect(isSolved(b)).toBe(false);
        expect(minSwaps(b)).toBeGreaterThanOrEqual((n * n) / 2);
      }
    }
  });

  it('swap 不修改原陣列', () => {
    const b = solvedBoard(3);
    const c = swap(b, 0, 8);
    expect(b).toEqual(solvedBoard(3));
    expect(c[0]).toBe(8);
    expect(c[8]).toBe(0);
  });

  it('minSwaps 與暴力 BFS 結果一致（小盤面）', () => {
    for (let t = 0; t < 200; t++) {
      const b = fisherYates([0, 1, 2, 3, 4, 5]);
      expect(minSwaps(b)).toBe(bfsMinSwaps(b));
    }
  });

  it('依 minSwaps 的步數交換後必定完成', () => {
    for (let t = 0; t < 200; t++) {
      let b = newGame(4);
      const expected = minSwaps(b);
      let moves = 0;
      for (let i = 0; i < b.length; i++) {
        while (b[i] !== i) {
          b = swap(b, i, b[i]);
          moves++;
        }
      }
      expect(isSolved(b)).toBe(true);
      expect(moves).toBe(expected);
    }
  });

  it('Fisher-Yates 均勻（卡方檢定，3 個元素 60,000 次）', () => {
    const counts = {};
    const N = 60000;
    for (let t = 0; t < N; t++) {
      const k = fisherYates([0, 1, 2]).join('');
      counts[k] = (counts[k] || 0) + 1;
    }
    expect(Object.keys(counts)).toHaveLength(6);
    const e = N / 6;
    const chi2 = Object.values(counts).reduce((s, o) => s + (o - e) ** 2 / e, 0);
    // 自由度 5，α = 0.001 的臨界值約 20.5
    expect(chi2).toBeLessThan(20.5);
  });

  it('correctCount', () => {
    expect(correctCount([0, 2, 1, 3])).toBe(2);
  });
});
