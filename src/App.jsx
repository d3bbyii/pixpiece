import { useCallback, useEffect, useRef, useState } from 'react';
import CameraStage from './components/CameraStage.jsx';
import PuzzleBoard from './components/PuzzleBoard.jsx';
import ResultView from './components/ResultView.jsx';
import { Btn, PixelIcon, Slot, ToolBtn, Win } from './components/Win.jsx';
import { hasCameraApi, isDesktop } from './lib/device.js';
import { THEMES } from './lib/image.js';
import { loadRecognizer } from './lib/recognizer.js';

// phase: loading → ready → live → puzzle → result（error 可從 loading / live 進入）
const STEP = {
  loading: '0/3 載入中',
  ready: '0/3 準備',
  live: '1/3 比 YA 拍照',
  puzzle: '2/3 拼回照片',
  result: '3/3 下載拍貼',
  error: '— 發生錯誤',
};

const TITLE = {
  loading: 'Pixpiece.exe',
  ready: 'Pixpiece.exe',
  live: 'Pixpiece.exe - Camera',
  puzzle: 'Pixpiece.exe - Puzzle',
  result: 'Pixpiece.exe - Done!',
  error: 'Pixpiece.exe - Error',
};

// 整個畫面的設計尺寸；螢幕較小時等比縮小（例如 1366×768 的筆電）
const SCREEN_W = 1100;
const SCREEN_H = 740;
function useFitScale() {
  const calc = () => Math.min(1, (window.innerWidth - 32) / SCREEN_W, (window.innerHeight - 32) / SCREEN_H);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const onResize = () => setScale(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

function MobileGate() {
  return (
    <div className="desktop">
      <Win title="Pixpiece.exe - Error" icon="heart" className="dialog">
        <div className="dialog-body">
          <PixelIcon name="camera" size={6} className="dialog-icon" />
          <div>
            <p>
              <b>此程式需要在電腦上執行。</b>
            </p>
            <p>Pixpiece 使用 webcam 手勢辨識與滑鼠拖曳拼圖，請用桌機或筆電的 Chrome、Edge 開啟這個網址。</p>
            <p className="muted">視窗寬度至少 1024 px。</p>
          </div>
        </div>
      </Win>
    </div>
  );
}

let logId = 0;

export default function App() {
  const [desktop] = useState(isDesktop);
  const [phase, setPhase] = useState('loading');
  const [model, setModel] = useState(null); // { recognizer, delegate } | null
  const [modelError, setModelError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [stats, setStats] = useState(null);
  const [theme, setTheme] = useState('sakura');
  const [prefs, setPrefs] = useState({ layout: 'classic', filter: 'original', caption: 'my y2k selfie - Notepad' });
  const [flash, setFlash] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [logs, setLogs] = useState([]);
  const [toolsEl, setToolsEl] = useState(null);
  const [statusEl, setStatusEl] = useState(null);
  const logRef = useRef(null);
  const scale = useFitScale();
  const clock = useClock();

  const log = useCallback((text) => {
    const d = new Date();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setLogs((l) => [...l.slice(-60), { id: ++logId, time, text }]);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  useEffect(() => {
    if (!desktop) return undefined;
    let alive = true;
    setPhase('loading');
    setModelError(null);
    loadRecognizer()
      .then((m) => {
        if (!alive) return;
        setModel(m);
        setPhase('ready');
        log(`手勢模型載入完成（${m.delegate}）`);
      })
      .catch((err) => {
        if (!alive) return;
        console.error(err);
        setModelError(err?.message || String(err));
        setPhase('error');
        log('手勢模型載入失敗');
      });
    return () => {
      alive = false;
    };
  }, [desktop, retryKey, log]);

  if (!desktop) return <MobileGate />;

  function startCamera() {
    if (!hasCameraApi()) {
      setCameraError('這個瀏覽器不支援相機存取，或網頁不是在 HTTPS 下開啟。');
      setPhase('error');
      return;
    }
    setCameraError(null);
    setPhase('live');
  }

  function handleCapture(dataUrl) {
    setPhoto(dataUrl);
    setFlash(true);
    setTimeout(() => setFlash(false), 450);
    setPhase('puzzle');
    log('照片切成拼圖並打亂了，把它拼回來！');
  }

  function handleSolved(s) {
    setStats(s);
    setPhase('result');
  }

  function pickTheme(key) {
    setTheme(key);
    log(`圖框換成 ${THEMES[key].name}`);
  }

  const slots = { tools: toolsEl, status: statusEl };
  const aiLabel = model ? `AI: ${model.delegate}` : phase === 'loading' ? 'AI: 載入中' : 'AI: 手動模式';

  return (
    <div className="desktop">
      <div className="screen" style={{ transform: `scale(${scale})` }}>
        {/* ---------- 主視窗 ---------- */}
        <Win title={TITLE[phase]} icon="cam" className="main-win">
          <nav className="menubar" aria-hidden="true">
            {['File', 'Edit', 'View', 'Photo', 'Help'].map((m) => (
              <span key={m}>
                <u>{m[0]}</u>
                {m.slice(1)}
              </span>
            ))}
          </nav>

          <div className="main-body">
            <div className="toolbox" ref={setToolsEl} />

            <div className="stage-area">
              {phase === 'loading' && (
                <div className="center-panel">
                  <div className="logo">PIXPIECE♥</div>
                  <div className="tagline">像素拼 · Say cheese, piece by piece</div>
                  <p>正在載入手勢辨識模型…</p>
                  <div className="progress-indeterminate">
                    <div className="blocks" />
                  </div>
                  <p className="muted">第一次開啟需下載約 8 MB，之後會使用快取。</p>
                </div>
              )}

              {phase === 'ready' && (
                <div className="center-panel">
                  <div className="logo">PIXPIECE♥</div>
                  <div className="tagline">像素拼 · Say cheese, piece by piece</div>
                  <ol className="how">
                    <li>
                      對鏡頭比出 <b>✌ YA</b>，保持 3 秒自動拍照
                    </li>
                    <li>照片會被切成拼圖並打亂，把它拼回來</li>
                    <li>挑版型、濾鏡和色盤配色，下載你的拍貼</li>
                  </ol>
                  <Btn primary className="big" onClick={startCamera}>
                    ♥ 開啟相機 ♥
                  </Btn>
                  <p className="muted">影像只在你的瀏覽器裡處理，不會上傳到任何伺服器。</p>
                </div>
              )}

              {phase === 'live' && (
                <CameraStage
                  key={`cam-${retryKey}`}
                  recognizer={model?.recognizer ?? null}
                  onCapture={handleCapture}
                  onError={(msg) => {
                    setCameraError(msg);
                    setPhase('error');
                    log('相機無法使用');
                  }}
                  slots={slots}
                  log={log}
                />
              )}

              {phase === 'puzzle' && photo && (
                <PuzzleBoard photo={photo} onSolved={handleSolved} onRetake={startCamera} slots={slots} log={log} />
              )}

              {phase === 'result' && photo && stats && (
                <ResultView
                  photo={photo}
                  stats={stats}
                  theme={theme}
                  prefs={prefs}
                  setPrefs={setPrefs}
                  onRetake={startCamera}
                  slots={slots}
                  log={log}
                />
              )}

              {phase === 'error' && (
                <div className="center-panel">
                  <div className="dialog-body">
                    <PixelIcon name="camera" size={6} className="dialog-icon" />
                    <div>
                      <p>
                        <b>{modelError ? '手勢模型載入失敗' : '相機無法使用'}</b>
                      </p>
                      <p>{modelError || cameraError}</p>
                    </div>
                  </div>
                  <div className="btn-row">
                    {modelError ? (
                      <>
                        <Btn onClick={() => setRetryKey((k) => k + 1)}>重試</Btn>
                        <Btn
                          onClick={() => {
                            setModelError(null);
                            setModel(null);
                            setPhase('ready');
                          }}
                        >
                          改用手動拍照
                        </Btn>
                      </>
                    ) : (
                      <Btn onClick={startCamera}>再試一次</Btn>
                    )}
                  </div>
                </div>
              )}
              {flash && <div className="flash" />}
            </div>

            {/* 色盤 = 拍貼圖框顏色 */}
            <div className="palette-row">
              <div className="palette-current" title={`目前圖框：${THEMES[theme].name}`}>
                <span style={{ background: THEMES[theme].swatch }} />
              </div>
              <div className="palette">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    type="button"
                    key={key}
                    className={`swatch ${theme === key ? 'is-active' : ''}`}
                    style={{ background: t.swatch }}
                    title={t.name}
                    aria-label={`圖框顏色 ${t.name}`}
                    onClick={() => pickTheme(key)}
                  />
                ))}
              </div>
              <span className="palette-label">FRAME: {THEMES[theme].name}</span>
            </div>
          </div>
        </Win>

        {/* ---------- 右側小視窗 ---------- */}
        <div className="side">
          <Win title="Status" icon="heart" className="status-win">
            <div className="status-body" ref={setStatusEl} />
          </Win>
          <Win title="Log" icon="chat" className="log-win">
            <div className="log-list" ref={logRef}>
              {logs.map((l) => (
                <div key={l.id} className="log-line">
                  <span className="log-time">{l.time}</span> {l.text}
                </div>
              ))}
            </div>
            <div className="log-input">
              &gt; <span className="blink">_</span>
            </div>
          </Win>
        </div>

        {/* ---------- 底部狀態列 ---------- */}
        <footer className="bottombar">
          <button type="button" className="start-btn" onClick={() => phase !== 'loading' && phase !== 'error' && setPhase('ready')}
            title="回到開始畫面">
            START
          </button>
          <span className="bar-field">STEP: {STEP[phase]}</span>
          <span className="bar-field">{aiLabel}</span>
          <span className="bar-field narrow">♥ LOCAL ONLY · {clock}</span>
        </footer>
      </div>

      {/* 準備 / 載入 / 錯誤階段的工具列與狀態內容 */}
      {(phase === 'ready' || phase === 'error' || phase === 'loading') && (
        <>
          <Slot target={toolsEl}>
            <ToolBtn icon="camera" label="相機" disabled={phase !== 'ready'} onClick={startCamera} />
          </Slot>
          <Slot target={statusEl}>
            <div className="status-line">
              <span className={`led ${phase === 'ready' ? 'on' : phase === 'error' ? '' : 'warn'}`} />
              <b>{phase === 'ready' ? '準備好了！' : phase === 'loading' ? '載入中…' : '需要處理'}</b>
            </div>
            <dl className="kv">
              <dt>手勢模型</dt>
              <dd>{model ? `已載入 · ${model.delegate}` : phase === 'loading' ? '下載中' : '未載入'}</dd>
              <dt>相機</dt>
              <dd>未開啟</dd>
              <dt>隱私</dt>
              <dd>影像不上傳</dd>
            </dl>
          </Slot>
        </>
      )}
    </div>
  );
}
