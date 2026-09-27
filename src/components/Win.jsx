import { createPortal } from 'react-dom';

// ---------- 像素圖示（1 = 上色），以 SVG 繪製，顏色跟隨 currentColor ----------
export const ICONS = {
  camera: ['00111000', '11111111', '10000001', '10011001', '10100101', '10011001', '10000001', '11111111'],
  timer: ['00111100', '00011000', '01111110', '11000011', '10011001', '10010001', '11000011', '01111110'],
  grid3: ['1111111', '1010101', '1111111', '1010101', '1111111', '1010101', '1111111'],
  grid4: ['111111111', '101010101', '111111111', '101010101', '111111111', '101010101', '111111111', '101010101', '111111111'],
  eye: ['00000000', '00111100', '01000010', '10011001', '10011001', '01000010', '00111100', '00000000'],
  dice: ['11111111', '10000001', '10110001', '10110001', '10001101', '10001101', '10000001', '11111111'],
  retake: ['00111101', '01000011', '10000111', '10000000', '10000001', '10000001', '01000010', '00111100'],
  save: ['11111110', '10100111', '10100101', '10111101', '10000001', '10111101', '10111101', '11111111'],
  heart: ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'],
  star: ['0001000', '0001000', '1111111', '0111110', '0110110', '1100011'],
  cam: ['01110', '11111', '11011', '11111', '01110'],
  win1: ['11111111', '11111111', '10000001', '10000001', '10000001', '10000001', '10000001', '11111111'],
  cascade: ['11111000', '10001000', '10111111', '11111111', '00100001', '00100001', '00100001', '00111111'],
  note: ['11111110', '10000011', '10111101', '10000001', '10111101', '10000001', '10110001', '11111111'],
  tall: ['011110', '011110', '010010', '010010', '010010', '011110', '010110', '011110'],
  chat: ['0111110', '1000001', '1000001', '1000001', '0111110', '0110000', '1000000'],
};

export function PixelIcon({ name, size = 3, className = '' }) {
  const rows = ICONS[name];
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg
      className={`pixel-icon ${className}`}
      width={w * size}
      height={h * size}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)),
      )}
    </svg>
  );
}

// ---------- 視窗 ----------
export function Win({ title, icon = 'cam', children, className = '', style }) {
  return (
    <section className={`win ${className}`} style={style}>
      <header className="win-title">
        <span className="win-title-text">
          <PixelIcon name={icon} size={3} />
          {title}
        </span>
        <span className="win-controls" aria-hidden="true">
          <span className="win-ctl">_</span>
          <span className="win-ctl">▫</span>
          <span className="win-ctl">×</span>
        </span>
      </header>
      <div className="win-body">{children}</div>
    </section>
  );
}

export function Btn({ children, primary, className = '', ...rest }) {
  return (
    <button type="button" className={`btn ${primary ? 'btn-primary' : ''} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** 左側工具列按鈕：像素圖示 + 小字標籤 */
export function ToolBtn({ icon, label, active, ...rest }) {
  return (
    <button type="button" className={`tool ${active ? 'is-active' : ''}`} title={label} {...rest}>
      <PixelIcon name={icon} size={3} />
      <span className="tool-label">{label}</span>
    </button>
  );
}

export function Meter({ value, label }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="meter" role="progressbar" aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div className="meter-fill" style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/** 把內容送進 App 版面中的指定區塊（工具列 / 狀態視窗） */
export function Slot({ target, children }) {
  return target ? createPortal(children, target) : null;
}
