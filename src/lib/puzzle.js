// 拼圖核心邏輯（純函式，不依賴 React，可單元測試）
// board[i] = 畫面第 i 格目前放的「原始區塊編號」；board[i] === i 代表放對。

/** 建立已完成的盤面 [0, 1, ..., n²-1] */
export function solvedBoard(n) {
  return Array.from({ length: n * n }, (_, i) => i);
}

/** Fisher-Yates 洗牌：每種排列機率相等，O(N²)（N² = 格數） */
export function fisherYates(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 通關驗證：每個 i 都滿足 board[i] === i，遇到不符提前結束 */
export function isSolved(board) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== i) return false;
  }
  return true;
}

/** 交換兩格，回傳新陣列（immutable，配合 React 狀態） */
export function swap(board, i, j) {
  if (i === j) return board;
  const next = board.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** 最少交換次數 = 格數 − 置換環數（置換環分解，O(N²)） */
export function minSwaps(board) {
  const seen = new Array(board.length).fill(false);
  let cycles = 0;
  for (let i = 0; i < board.length; i++) {
    if (seen[i]) continue;
    cycles++;
    let k = i;
    while (!seen[k]) {
      seen[k] = true;
      k = board[k];
    }
  }
  return board.length - cycles;
}

/** 產生新局：洗牌後若已完成或太簡單（最少步數 < 格數/2）就重洗 */
export function newGame(n, rand = Math.random) {
  const cells = n * n;
  let board;
  do {
    board = fisherYates(solvedBoard(n), rand);
  } while (isSolved(board) || minSwaps(board) < cells / 2);
  return board;
}

/** 目前放對的格數（顯示進度用） */
export function correctCount(board) {
  let c = 0;
  for (let i = 0; i < board.length; i++) if (board[i] === i) c++;
  return c;
}
