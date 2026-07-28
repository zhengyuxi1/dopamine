/**
 * 主站 / 预览站共享配置（worktree merge 后两边代码相同，靠 DOPAMINE_SITE 区分）
 *
 * 浏览器侧请求路径统一用 apiPaths（/api、/api/vibe），
 * 差异仅在 Vite proxy 转发到哪条后端（shopApiOrigin / vibeApiOrigin）。
 */

/** @type {Record<string, { prefix: string, target: 'shop' | 'vibe' }[]>} */
export const PROXY_ROUTES = {
  main: [
    { prefix: '/api', target: 'shop' },
    { prefix: '/images', target: 'shop' },
    // /preview/5201+ 由 buildPreviewPortProxy 动态反代到各用户预览 Vite
  ],
  preview: [
    // 更长前缀优先匹配
    { prefix: '/api/vibe', target: 'vibe' },
    { prefix: '/api', target: 'shop' },
    { prefix: '/images', target: 'shop' },
  ],
};

/** 前端 fetch 使用的 URL 前缀（主站 / 预览站相同，便于 merge） */
export const API_PATHS = {
  shop: '/api',
  vibe: '/api/vibe',
  images: '/images',
};

/** @type {Record<string, object>} */
export const SITE_PROFILES = {
  main: {
    site: 'main',
    frontendPort: 5173,
    shopApiOrigin: 'http://localhost:4001',
    /** 主站 vibe 编排（workspace）暂走商城后端；拆分后仍可用此地址 */
    vibeApiOrigin: 'http://localhost:4001',
    publicOrigin: '',
    base: '/',
    vibeEnabled: false,
    vibeLauncher: true,
  },
  preview: {
    site: 'preview',
    /** 预览统一网关（cpolar 隧道 2 → 5180） */
    gatewayPort: 5180,
    frontendPortBase: 5201,
    backendPortBase: 4201,
    shopApiOrigin: 'http://localhost:4001',
    /** spawn 时按用户注入 VIBE_API_ORIGIN=http://localhost:420x */
    vibeApiOrigin: 'http://localhost:4001',
    publicOrigin: '',
    /** spawn 时按用户注入 VITE_BASE=/preview/520x/ */
    base: '/',
    previewPathPrefix: '/preview',
    vibeEnabled: true,
    vibeLauncher: false,
  },
};

export const CPOLAR_ALLOWED_HOSTS = ['.cpolar.top', '.cpolar.cn'];
