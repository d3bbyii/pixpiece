# Pixpiece.exe | 像素拼

> Say cheese, piece by piece ♥

Y2K 手勢拍貼拼圖網頁（電腦・平板・手機）

比 ✌ YA 自動拍照 → 把打亂的照片拼回來 → 下載 Y2K 拍貼。全部在瀏覽器內完成，影像不會上傳。

## 快速開始

```bash
npm install
npm run dev        # 開啟 http://localhost:5173（localhost 可以使用相機）
npm test           # 執行拼圖與手勢觸發邏輯的單元測試
npm run build      # 產出 dist/，可直接部署到 Vercel / Netlify
```

`npm run dev` 與 `npm run build` 會先自動執行 `scripts/fetch-assets.mjs`：

- 把 `node_modules/@mediapipe/tasks-vision/wasm` 複製到 `public/mediapipe/wasm`
- 下載手勢模型到 `public/models/gesture_recognizer.task`（約 8 MB，只下載一次）

模型下載失敗時不會中斷，執行時會自動改用 Google 官方網址載入。

## 部署到 Vercel

1. 把專案推到 GitHub。
2. 在 Vercel 匯入這個 repo，Framework 選 **Vite**，其餘用預設值。
3. 之後每次 push 都會自動重新部署，Vercel 也會提供 HTTPS（相機必要條件）。

## 專案結構

```
src/
  config.js                 所有可調參數（門檻、倒數長度、圖片尺寸）
  App.jsx                   狀態機：loading → ready → live → puzzle → result
  components/
    Win.jsx                 Y2K 視窗、按鈕、進度條
    CameraStage.jsx         相機、逐幀辨識、倒數、擷取
    PuzzleBoard.jsx         拖曳 / 點擊交換拼圖
    ResultView.jsx          圖框樣式、預覽、下載
  lib/
    puzzle.js (+ test)      Fisher-Yates、通關驗證、最少步數（置換環）
    gesture.js (+ test)     YA 判斷（模型 + 幾何備援）與觸發狀態機
    recognizer.js           MediaPipe GestureRecognizer 單例（GPU → CPU 備援）
    camera.js               開關相機、錯誤訊息
    image.js                鏡像正方形擷取、拍貼卡合成、PNG 下載
    device.js               版面判斷 wide / compact（網址加 ?layout=compact 可強制手機版，測試用）
```

## 調整手感

所有防誤觸參數都在 `src/config.js` 的 `GESTURE`：

| 參數 | 預設 | 說明 |
| --- | --- | --- |
| scoreThreshold | 0.6 | Victory 分數門檻 |
| triggerHoldMs | 300 | YA 穩定多久才開始倒數 |
| countdownMs | 3000 | 倒數長度 |
| cancelHoldMs | 300 | 倒數中張開手掌多久才取消（倒數期間可自由換姿勢） |
| cooldownMs | 1500 | 開相機後 / 拍完後的冷卻 |
| extendRatio | 1.1 | 幾何判斷的伸直門檻 |

## 瀏覽器支援

Chrome / Edge 110+、Firefox 115+、Safari 16.4+（含 iPhone / iPad）。

| 裝置 | 版面 | 儲存拍貼 |
| --- | --- | --- |
| 電腦、橫向平板 | 多視窗桌面（小螢幕自動等比縮小） | 下載 PNG |
| 手機、直向平板 | 直式單欄，工具列與色盤可橫向滑動 | 分享選單，可直接存入相簿 |

手機和平板要用 HTTPS 開啟才能使用相機（部署到 Vercel 即可；本機測試可用 `npm run dev -- --host` 搭配同網段的 HTTPS 通道）。
