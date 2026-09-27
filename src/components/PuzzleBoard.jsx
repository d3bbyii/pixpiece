import { useEffect, useRef, useState } from 'react';
import { correctCount, isSolved, minSwaps, newGame, swap } from '../lib/puzzle.js';
import { formatTime } from '../lib/image.js';
import { Slot, ToolBtn } from './Win.jsx';
import { DIFFICULTIES } from '../config.js';

const DRAG_THRESHOLD = 6;

function pieceStyle(piece, n, photo) {
  const col = piece % n;
  const row = Math.floor(piece / n);
  return {
    backgroundImage: `url(${photo})`,
    backgroundSize: `${n * 100}% ${n * 100}%`,
    backgroundPosition: `${(col * 100) / (n - 1)}% ${(row * 100) / (n - 1)}%`,
  };
}

/**
 * 拼圖盤：拖曳一塊到另一塊上交換，或依序點兩塊交換。
 * 通關時呼叫 onSolved({ n, moves, best, timeMs })
 */
export default function PuzzleBoard({ photo, onSolved, onRetake, slots, log }) {
  const [n, setN] = useState(3);
  const [board, setBoard] = useState(() => newGame(3));
  const [best, setBest] = useState(() => minSwaps(board));
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState(() => performance.now());
  const [now, setNow] = useState(() => performance.now());
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null); // { from, over, x, y, sx, sy, moved }
  const [peek, setPeek] = useState(false);
  const [solved, setSolved] = useState(false);
  const boardRef = useRef(null);

  // 計時器
  useEffect(() => {
    if (solved) return undefined;
    const id = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(id);
  }, [solved]);

  function restart(size) {
    const b = newGame(size);
    setN(size);
    setBoard(b);
    setBest(minSwaps(b));
    setMoves(0);
    setSelected(null);
    setStartedAt(performance.now());
    setNow(performance.now());
    log(`重新洗牌：${size}×${size}，最少 ${minSwaps(b)} 步`);
  }

  function doSwap(i, j) {
    if (i === j || solved) return;
    const next = swap(board, i, j);
    const m = moves + 1;
    setBoard(next);
    setMoves(m);
    if (isSolved(next)) {
      log(`★ 完成！共 ${m} 步（最少 ${best} 步）`);
      const timeMs = performance.now() - startedAt;
      setSolved(true);
      setNow(performance.now());
      // 先播放通關動畫，再切到結果頁
      setTimeout(() => onSolved({ n, moves: m, best, timeMs }), 1400);
    }
  }

  function cellAt(clientX, clientY) {
    const rect = boardRef.current.getBoundingClientRect();
    const size = rect.width / n;
    const col = Math.floor((clientX - rect.left) / size);
    const row = Math.floor((clientY - rect.top) / size);
    if (col < 0 || row < 0 || col >= n || row >= n) return null;
    return row * n + col;
  }

  // 視窗可能被等比縮放，把螢幕座標換算成盤面內部座標
  function localPoint(e) {
    const rect = boardRef.current.getBoundingClientRect();
    const k = boardRef.current.offsetWidth / rect.width;
    return { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k };
  }

  function onPointerDown(e) {
    if (solved || e.button !== 0) return;
    const idx = cellAt(e.clientX, e.clientY);
    if (idx === null) return;
    boardRef.current.setPointerCapture(e.pointerId);
    const cell = (boardRef.current.clientWidth - 6) / n; // 盤面大小依裝置而定（CSS 變數 --board-size）
    setDrag({ from: idx, over: idx, sx: e.clientX, sy: e.clientY, ...localPoint(e), cell, moved: false });
  }

  function onPointerMove(e) {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > DRAG_THRESHOLD;
    setDrag({ ...drag, moved, over: cellAt(e.clientX, e.clientY), ...localPoint(e) });
  }

  function onPointerUp() {
    if (!drag) return;
    const { from, over, moved } = drag;
    setDrag(null);
    if (moved) {
      if (over !== null && over !== from) doSwap(from, over);
      setSelected(null);
      return;
    }
    // 沒有拖動 → 視為點擊：第一下選取，第二下交換
    if (selected === null) setSelected(from);
    else if (selected === from) setSelected(null);
    else {
      doSwap(selected, from);
      setSelected(null);
    }
  }

  const elapsed = now - startedAt;
  const correct = correctCount(board);

  return (
    <>
      <div
        ref={boardRef}
        className={`board ${solved ? 'is-solved' : ''} ${drag?.moved ? 'is-dragging' : ''}`}
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        {board.map((piece, i) => {
          const classes = ['tile'];
          if (selected === i) classes.push('is-selected');
          if (drag?.moved && drag.from === i) classes.push('is-source');
          if (drag?.moved && drag.over === i && drag.from !== i) classes.push('is-target');
          if (piece === i && !solved) classes.push('is-correct');
          return (
            <div
              key={piece}
              className={classes.join(' ')}
              style={{ ...pieceStyle(piece, n, photo), animationDelay: `${i * 40}ms` }}
              aria-label={`第 ${i + 1} 格`}
            />
          );
        })}
        {drag?.moved && (
          <div
            className="tile ghost"
            style={{
              ...pieceStyle(board[drag.from], n, photo),
              width: drag.cell,
              height: drag.cell,
              left: drag.x - drag.cell / 2,
              top: drag.y - drag.cell / 2,
            }}
          />
        )}
        {peek && <img className="peek" src={photo} alt="原圖預覽" />}
        {solved && <div className="solved-banner">★ PUZZLE COMPLETE ★</div>}
      </div>

      <Slot target={slots.tools}>
        {DIFFICULTIES.map((d) => (
          <ToolBtn
            key={d}
            icon={d === 3 ? 'grid3' : 'grid4'}
            label={`${d}×${d}`}
            active={n === d}
            disabled={solved}
            onClick={() => n !== d && restart(d)}
          />
        ))}
        <ToolBtn
          icon="eye"
          label="偷看"
          disabled={solved}
          onPointerDown={() => setPeek(true)}
          onContextMenu={(e) => e.preventDefault()}
          onPointerUp={() => setPeek(false)}
          onPointerLeave={() => setPeek(false)}
        />
        <ToolBtn icon="dice" label="洗牌" disabled={solved} onClick={() => restart(n)} />
        <ToolBtn icon="retake" label="重拍" disabled={solved} onClick={onRetake} />
      </Slot>

      <Slot target={slots.status}>
        <dl className="kv big">
          <dt>步數</dt>
          <dd>{moves}</dd>
          <dt>最少步數</dt>
          <dd>{best}</dd>
          <dt>時間</dt>
          <dd>{formatTime(elapsed)}</dd>
          <dt>已放對</dt>
          <dd>
            {correct}/{n * n}
          </dd>
        </dl>
        <p className="help">拖曳一塊到另一塊上交換，或依序點兩塊交換。按住「偷看」可以看原圖。</p>
      </Slot>
    </>
  );
}
