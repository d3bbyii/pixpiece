import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // MediaPipe 本身就是預先編譯好的 ESM + WASM，不需要讓 Vite 重新打包
  optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] },
  test: { environment: 'node' },
});
