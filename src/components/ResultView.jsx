import { useEffect, useRef, useState } from 'react';
import { composeCard, LAYOUTS } from '../lib/card.js';
import { applyFilter, FILTERS } from '../lib/filters.js';
import { downloadCanvas, formatTime, loadImage, THEMES } from '../lib/image.js';
import { Slot, ToolBtn } from './Win.jsx';

/**
 * 結果頁：選版型（左側工具列）、濾鏡（右側縮圖）、配色（下方色盤），預覽並下載
 * prefs = { layout, filter, caption }，由 App 保存，重拍後仍沿用
 */
export default function ResultView({ photo, stats, theme, prefs, setPrefs, onRetake, slots, log }) {
  const [filtered, setFiltered] = useState(null); // { key: canvas }
  const [thumbs, setThumbs] = useState({}); // { key: dataURL }
  const [preview, setPreview] = useState(null);
  const canvasRef = useRef(null);
  const { layout, filter, caption } = prefs;

  // 照片載入後一次算好所有濾鏡
  useEffect(() => {
    let alive = true;
    loadImage(photo).then((img) => {
      if (!alive) return;
      const map = {};
      const th = {};
      for (const key of Object.keys(FILTERS)) {
        map[key] = applyFilter(key, img, img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = 96;
        c.height = 96;
        c.getContext('2d').drawImage(map[key], 0, 0, 96, 96);
        th[key] = c.toDataURL('image/png');
      }
      setFiltered(map);
      setThumbs(th);
    });
    return () => {
      alive = false;
    };
  }, [photo]);

  // 任何選項改變就重新合成
  useEffect(() => {
    if (!filtered) return undefined;
    let alive = true;
    composeCard({ layout, themeKey: theme, filterKey: filter, filtered, stats, caption }).then((canvas) => {
      if (!alive) return;
      canvasRef.current = canvas;
      setPreview(canvas.toDataURL('image/png'));
    });
    return () => {
      alive = false;
    };
  }, [filtered, layout, theme, filter, stats, caption]);

  const efficiency = stats.moves > 0 ? Math.round((stats.best / stats.moves) * 100) : 100;

  function set(key, value, msg) {
    setPrefs((p) => ({ ...p, [key]: value }));
    if (msg) log(msg);
  }

  return (
    <>
      <div className="result-wrap">
        <div className="result-preview">
          {preview ? (
            <img src={preview} alt="合成後的 Y2K 拍貼" className="card-img" />
          ) : (
            <div className="viewfinder-msg blink">RENDERING…</div>
          )}
        </div>

        <div className="result-side">
          <div className="side-label">FILTER</div>
          <div className="filter-grid">
            {Object.entries(FILTERS).map(([key, f]) => (
              <button
                type="button"
                key={key}
                className={`filter-btn ${filter === key ? 'is-active' : ''}`}
                onClick={() => filter !== key && set('filter', key, `濾鏡換成 ${f.name}`)}
              >
                {thumbs[key] ? <img src={thumbs[key]} alt="" /> : <span className="thumb-empty" />}
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          {layout === 'notepad' && (
            <label className="caption-field">
              <span className="side-label">視窗標題</span>
              <input
                type="text"
                value={caption}
                maxLength={32}
                placeholder="my y2k selfie - Notepad"
                onChange={(e) => set('caption', e.target.value)}
              />
            </label>
          )}
        </div>
      </div>

      <Slot target={slots.tools}>
        <ToolBtn
          icon="save"
          label="下載"
          disabled={!preview}
          onClick={async () => {
            await downloadCanvas(canvasRef.current);
            log('拍貼已下載 ♥');
          }}
        />
        <ToolBtn icon="retake" label="再拍" onClick={onRetake} />
        <div className="tool-sep" />
        {Object.entries(LAYOUTS).map(([key, l]) => (
          <ToolBtn
            key={key}
            icon={l.icon}
            label={l.name}
            active={layout === key}
            onClick={() => layout !== key && set('layout', key, `版型換成「${l.name}」`)}
          />
        ))}
      </Slot>

      <Slot target={slots.status}>
        <dl className="kv big">
          <dt>難度</dt>
          <dd>
            {stats.n}×{stats.n}
          </dd>
          <dt>步數</dt>
          <dd>{stats.moves}</dd>
          <dt>最少步數</dt>
          <dd>{stats.best}</dd>
          <dt>效率</dt>
          <dd>{efficiency}%</dd>
          <dt>時間</dt>
          <dd>{formatTime(stats.timeMs)}</dd>
        </dl>
        <p className="help">
          {LAYOUTS[layout].name} · {FILTERS[filter].name} · {THEMES[theme].name}
        </p>
      </Slot>
    </>
  );
}
