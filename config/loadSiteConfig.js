import {
  API_PATHS,
  CPOLAR_ALLOWED_HOSTS,
  PROXY_ROUTES,
  SITE_PROFILES,
} from './site.config.js';

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function loadSiteConfig(env = process.env) {
  const siteName = env.DOPAMINE_SITE === 'preview' ? 'preview' : 'main';
  const profile = { ...SITE_PROFILES[siteName] };

  if (env.SHOP_API_ORIGIN) profile.shopApiOrigin = env.SHOP_API_ORIGIN;
  if (env.VIBE_API_ORIGIN) profile.vibeApiOrigin = env.VIBE_API_ORIGIN;
  if (!profile.vibeApiOrigin) profile.vibeApiOrigin = profile.shopApiOrigin;

  const publicOrigin =
    env.PUBLIC_ORIGIN ||
    (siteName === 'preview' ? env.PREVIEW_PUBLIC_ORIGIN : env.MAIN_PUBLIC_ORIGIN);
  if (publicOrigin) profile.publicOrigin = publicOrigin.replace(/\/$/, '');

  if (env.VITE_BASE) profile.base = env.VITE_BASE;
  // Frontend port comes from VITE_PORT / MAIN_VITE_PORT — never reuse server PORT
  // (blue/green slots use PORT for Node and VITE_PORT for Vite).
  if (env.VITE_PORT) profile.frontendPort = Number(env.VITE_PORT);
  else if (env.MAIN_VITE_PORT) profile.frontendPort = Number(env.MAIN_VITE_PORT);

  return {
    ...profile,
    apiPaths: { ...API_PATHS },
    proxyRoutes: [...PROXY_ROUTES[siteName]],
    allowedHosts: [...CPOLAR_ALLOWED_HOSTS],
  };
}

/**
 * @param {ReturnType<typeof loadSiteConfig>} config
 */
export function buildViteProxy(config) {
  const targets = {
    shop: config.shopApiOrigin,
    vibe: config.vibeApiOrigin || config.shopApiOrigin,
  };

  /** @type {Record<string, import('vite').ProxyOptions>} */
  const proxy = {};
  const routes = [...config.proxyRoutes].sort((a, b) => b.prefix.length - a.prefix.length);

  for (const route of routes) {
    proxy[route.prefix] = {
      target: targets[route.target],
      changeOrigin: true,
    };
  }

  // 单隧道回退：未配置 PREVIEW_PUBLIC_ORIGIN 时，主站 5173 反代 /preview/*
  if (config.site === 'main' && !process.env.PREVIEW_PUBLIC_ORIGIN) {
    Object.assign(proxy, buildPreviewPortProxy(config));
  }

  return proxy;
}

/**
 * 主站 5173 反代各用户预览前端（5201+），仅需穿透主站一条隧道
 * @param {ReturnType<typeof loadSiteConfig>} config
 */
export function buildPreviewPortProxy(config) {
  const previewProfile = SITE_PROFILES.preview;
  const pathPrefix = previewProfile.previewPathPrefix || '/preview';
  const portBase = Number(process.env.VIBE_PREVIEW_PORT_BASE || previewProfile.frontendPortBase);
  const portMax = portBase + 200;
  const escaped = pathPrefix.replace(/\//g, '\\/');

  return {
    [`^${escaped}/(\\d+)`]: {
      target: `http://127.0.0.1:${portBase}`,
      changeOrigin: true,
      ws: true,
      router(req) {
        const m = req.url?.match(new RegExp(`^${escaped}/(\\d+)`));
        if (m) {
          const port = Number(m[1]);
          if (port >= portBase && port < portMax) {
            return `http://127.0.0.1:${port}`;
          }
        }
        return `http://127.0.0.1:${portBase}`;
      },
    },
  };
}

/**
 * 预览页公网 / 相对 URL（供 /api/vibe/workspace 返回）
 * @param {ReturnType<typeof loadSiteConfig>} config
 * @param {number} frontendPort
 */
export function buildPreviewPublicUrl(config, frontendPort) {
  const path = `${config.previewPathPrefix}/${frontendPort}/`;
  if (config.publicOrigin) {
    return new URL(path, `${config.publicOrigin}/`).toString();
  }
  return path;
}

/** 拼接 base 与静态资源路径（预览页 /preview/5201/ 下必须带 base） */
export function joinBasePath(base, path) {
  const normalized = path.replace(/^\//, '');
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}${normalized}`;
}

/** 注入到 index.html，供 public/vibe-*.js 读取 */
export function buildClientRuntimeConfig(config) {
  return {
    shopApi: config.apiPaths.shop,
    vibeApi: config.apiPaths.vibe,
    images: config.apiPaths.images,
    site: config.site,
    base: config.base || '/',
  };
}
