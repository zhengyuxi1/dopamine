import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 主站注入入口按钮；worktree 预览只注入 Entry 托管的 iframe 选区桥接。
function injectVibe() {
  const vibeFull = process.env.VIBE_ENABLED === 'true';
  const launcherEnabled = !vibeFull && process.env.VIBE_LAUNCHER !== 'false';
  if (!vibeFull && !launcherEnabled) return { name: 'inject-vibe-noop' };

  const bridgeSrc = process.env.VIBE_BRIDGE_SRC || '/__vibe/assets/preview-bridge.js';
  const launcherSrc = process.env.VIBE_LAUNCHER_SRC || '/vibe-launcher.js';

  return {
    name: 'inject-vibe',
    transformIndexHtml(html) {
      let scripts = '';
      if (vibeFull) {
        scripts += `<script src="${bridgeSrc}" defer></script>\n`;
      } else if (launcherEnabled) {
        scripts += `<script src="${launcherSrc}" async></script>\n`;
      }
      if (!scripts) return html;
      return html.replace('</body>', scripts + '</body>');
    },
  };
}

const apiTarget = process.env.VITE_API_PROXY || 'http://localhost:4001';
const vibeTarget = process.env.VITE_VIBE_PROXY || apiTarget;

const proxyToApi = {
  '/api/vibe': {
    target: vibeTarget,
    changeOrigin: true,
  },
  '/api': {
    target: apiTarget,
    changeOrigin: true,
  },
  '/images': {
    target: apiTarget,
    changeOrigin: true,
  },
};

// 统一入口下预览站路径前缀，如 /p/1/
const previewBase = process.env.VITE_PREVIEW_BASE || '/';
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || 0);
const isPreviewStack = process.env.VIBE_ENABLED === 'true' && previewBase !== '/';

/** 旧 worktree 的 App.jsx 可能没有 basename；在转换期注入，避免 /p/:id 下空白页 */
function injectPreviewBasename() {
  const base = previewBase.replace(/\/$/, '');
  if (!base) return { name: 'inject-preview-basename-noop' };
  return {
    name: 'inject-preview-basename',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]src[\\/]App\.[jt]sx?$/.test(id)) return null;
      if (code.includes('basename=')) return null;
      if (!code.includes('BrowserRouter')) return null;
      const next = code.replace(
        /<BrowserRouter(\s|>)/,
        `<BrowserRouter basename="${base}"$1`,
      );
      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  base: previewBase,
  plugins: [react(), injectVibe(), injectPreviewBasename()],
  server: {
    port: Number(process.env.VITE_PORT || 5173),
    host: isPreviewStack ? '127.0.0.1' : true,
    strictPort: isPreviewStack,
    proxy: proxyToApi,
    ...(hmrClientPort
      ? {
          hmr: {
            clientPort: hmrClientPort,
            protocol: 'ws',
          },
        }
      : {}),
  },
  preview: {
    port: 5173,
    host: true,
    proxy: proxyToApi,
  },
});
