import { useEffect, useRef, useState } from 'react';
import { GESTURE } from '../config.js';
import { cameraErrorMessage, openCamera, stopCamera } from '../lib/camera.js';
import { classifyFrame, createTrigger } from '../lib/gesture.js';
import { captureSquare } from '../lib/image.js';
import { Meter, Slot, ToolBtn } from './Win.jsx';

const IDLE_VIEW = { state: 'idle', score: 0, label: 'None', ya: false, fps: 0 };

/**
 * 相機 + 手勢辨識 + 倒數。
 * recognizer 為 null 時只能手動拍照（模型載入失敗的備援）。
 */
export default function CameraStage({ recognizer, onCapture, onError, slots, log }) {
  const videoRef = useRef(null);
  const manualRef = useRef(null); // 手動倒數開始時間
  const [view, setView] = useState(IDLE_VIEW);
  const [camReady, setCamReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const trigger = createTrigger();
    let stream = null;
    let raf = 0;
    let cancelled = false;

    (async () => {
      try {
        stream = await openCamera(video);
      } catch (err) {
        if (!cancelled) onError(cameraErrorMessage(err));
        return;
      }
      if (cancelled) {
        stopCamera(stream, video);
        return;
      }
      setCamReady(true);
      log(`相機已開啟（${video.videoWidth}×${video.videoHeight}）`);
      log(recognizer ? '對鏡頭比 ✌ 就會開始倒數' : '按左邊「手動」開始倒數');
      trigger.reset(performance.now()); // 剛開相機先冷卻，避免一開就觸發

      let lastVideoTime = -1;
      let frames = 0;
      let fpsSince = performance.now();
      let fps = 0;
      let prevState = 'idle';

      const loop = () => {
        if (cancelled) return;
        const now = performance.now();
        // 只在有新影格時辨識，避免重複處理同一幀
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;

          let cls = { ya: false, score: 0, label: 'None' };
          if (recognizer) {
            try {
              const res = recognizer.recognizeForVideo(video, now);
              cls = classifyFrame(res, video.videoWidth / video.videoHeight);
            } catch (err) {
              console.warn('辨識失敗，略過此幀', err);
            }
          }

          frames++;
          if (now - fpsSince >= 1000) {
            fps = (frames * 1000) / (now - fpsSince);
            frames = 0;
            fpsSince = now;
          }

          let r;
          if (manualRef.current !== null) {
            const remainingMs = GESTURE.countdownMs - (now - manualRef.current);
            r = remainingMs <= 0 ? { state: 'fire' } : { state: 'counting', remainingMs };
          } else {
            r = trigger.step(now, cls.ya, cls.palm);
          }

          if (r.state === 'counting' && prevState !== 'counting') log('✌ 偵測到 YA，倒數 3 秒，換個姿勢吧！');
          if (r.cancelled) log('✋ 偵測到張開手掌，取消倒數');
          prevState = r.state;

          if (r.state === 'fire') {
            log('喀嚓！照片拍好了');
            const photo = captureSquare(video);
            stopCamera(stream, video); // 拍完立即關相機，鏡頭指示燈熄滅
            stream = null;
            onCapture(photo);
            return;
          }
          setView({ ...cls, ...r, fps });
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopCamera(stream, video);
    };
    // recognizer / 回呼在此元件生命週期內不會改變
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counting = view.state === 'counting';
  const seconds = counting ? Math.ceil(view.remainingMs / 1000) : null;

  const ledClass = view.ya ? 'on' : view.hasHand ? 'warn' : '';
  const hint = !recognizer
    ? '手勢模型未載入，請用手動拍照'
    : counting
      ? '擺好姿勢！✋ 張開手掌可取消'
      : view.ya
      ? 'YA 偵測到了！'
      : view.hasHand
        ? '看到手了，比個 ✌'
        : '請把手舉到鏡頭前';

  return (
    <>
      <div className={`viewfinder ${counting ? 'is-counting' : ''}`}>
        <video ref={videoRef} className="video" muted playsInline />
        {!camReady && <div className="viewfinder-msg blink">CONNECTING CAMERA…</div>}
        <div className="corner tl" />
        <div className="corner tr" />
        <div className="corner bl" />
        <div className="corner br" />
        <div className="rec">
          <span className="rec-dot" /> REC
        </div>
        {counting && (
          <div className="countdown" key={seconds}>
            {seconds}
          </div>
        )}
        {view.state === 'arming' && <div className="hint-pop">✌ 保持住！</div>}
        {counting && recognizer && manualRef.current === null && (
          <div className="hint-pop">換個姿勢吧！✋ 張開手掌取消</div>
        )}
      </div>

      <Slot target={slots.tools}>
        <ToolBtn
          icon="timer"
          label="手動"
          onClick={() => {
            if (manualRef.current === null) manualRef.current = performance.now();
          }}
          disabled={!camReady || counting}
        />
      </Slot>

      <Slot target={slots.status}>
        <div className="status-line">
          <span className={`led ${ledClass}`} />
          <b>{hint}</b>
        </div>
        <div className="field-label">YA 信心分數</div>
        <Meter value={view.label === 'Victory' ? view.score : 0} label="YA 信心分數" />
        <dl className="kv">
          <dt>辨識速度</dt>
          <dd>{recognizer ? `${view.fps.toFixed(0)} FPS` : '—'}</dd>
          <dt>狀態</dt>
          <dd>{counting ? `倒數 ${seconds}` : view.state === 'arming' ? '確認中' : '等待手勢'}</dd>
        </dl>
      </Slot>
    </>
  );
}
