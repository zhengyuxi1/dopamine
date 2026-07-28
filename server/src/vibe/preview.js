/**
 * Thin client: preview spawn/kill lives in CC Entry (ops/dopamine).
 * Dopamine shop slots no longer own preview processes — survives blue/green switch.
 */
const ENTRY =
  (process.env.VIBE_ORCHESTRATOR_URL || process.env.VIBE_PUBLIC_BASE || 'http://127.0.0.1:4001').replace(
    /\/$/,
    '',
  );

const IS_LOCAL_PREVIEW = process.env.VIBE_LOCAL_PREVIEW === '1';
const LOCAL_USER_ID = process.env.VIBE_USER_ID;
const LOCAL_FRONTEND_PORT = Number(process.env.VIBE_FRONTEND_PORT || 0);
const LOCAL_BACKEND_PORT = Number(process.env.VIBE_BACKEND_PORT || 0);
const LOCAL_WORKTREE = process.env.VIBE_WORKTREE_PATH || '';

/** @type {Set<(userId: string|number) => void>} */
const stopListeners = new Set();

export function publicPreviewUrl(userId) {
  // Path-only so the browser stays on the Host the user opened (not 127.0.0.1).
  if (process.env.VIBE_PREVIEW_ABSOLUTE_URL === '1') {
    return `${ENTRY}/p/${userId}/`;
  }
  return `/p/${userId}/`;
}

export function previewBasePath(userId) {
  return `/p/${userId}/`;
}

export function onPreviewStop(fn) {
  stopListeners.add(fn);
  return () => stopListeners.delete(fn);
}

/** Called from /api/vibe/internal/preview-stopped (CC Entry webhook). */
export function emitPreviewStop(userId) {
  for (const fn of stopListeners) {
    try {
      fn(userId);
    } catch (e) {
      console.warn('[vibe/preview] stop listener error:', e.message);
    }
  }
}

async function ccFetch(path, init) {
  const res = await fetch(`${ENTRY}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    signal: init?.signal || AbortSignal.timeout(120000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `CC preview ${path} HTTP ${res.status}`);
  }
  return body;
}

export async function uploadVibeMaterials(assets) {
  const body = await ccFetch('/__cc/images/upload-materials', {
    method: 'POST',
    body: JSON.stringify({ assets }),
    signal: AbortSignal.timeout(300000),
  });
  return Array.isArray(body.assets) ? body.assets : [];
}

function localPayload(worktreePath) {
  const key = String(LOCAL_USER_ID);
  return {
    url: publicPreviewUrl(key),
    port: LOCAL_FRONTEND_PORT,
    backendPort: LOCAL_BACKEND_PORT,
    worktreePath: worktreePath || LOCAL_WORKTREE,
  };
}

/**
 * @returns {Promise<{ url: string, port: number, backendPort: number, worktreePath: string }>}
 */
export async function ensureUserPreview(userId, worktreePath) {
  if (IS_LOCAL_PREVIEW) {
    if (String(userId) !== String(LOCAL_USER_ID)) {
      throw new Error('预览栈用户不匹配');
    }
    return localPayload(worktreePath);
  }
  const body = await ccFetch('/__cc/preview/ensure', {
    method: 'POST',
    body: JSON.stringify({ userId: String(userId), worktreePath }),
  });
  return {
    url: body.url || publicPreviewUrl(userId),
    port: body.port,
    backendPort: body.backendPort,
    worktreePath: body.worktreePath || worktreePath,
  };
}

export async function restartUserPreview(userId, target = 'both', worktreePath) {
  if (IS_LOCAL_PREVIEW) {
    return localPayload(worktreePath);
  }
  const body = await ccFetch('/__cc/preview/restart', {
    method: 'POST',
    body: JSON.stringify({
      userId: String(userId),
      target,
      worktreePath,
    }),
  });
  return {
    url: body.url || publicPreviewUrl(userId),
    port: body.port,
    backendPort: body.backendPort,
    worktreePath: body.worktreePath || worktreePath,
  };
}

export function stopPreview(userId) {
  if (IS_LOCAL_PREVIEW) return;
  ccFetch('/__cc/preview/stop', {
    method: 'POST',
    body: JSON.stringify({ userId: String(userId) }),
  }).catch((e) => console.warn('[vibe/preview] stop failed:', e.message));
}

export function touchPreview(userId) {
  if (IS_LOCAL_PREVIEW && process.env.VIBE_TOUCH_TOKEN) {
    fetch(`${ENTRY}/api/vibe/internal/touch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: String(userId), token: process.env.VIBE_TOUCH_TOKEN }),
    }).catch(() => {});
    return;
  }
  if (IS_LOCAL_PREVIEW) return;
  ccFetch('/__cc/preview/touch', {
    method: 'POST',
    body: JSON.stringify({ userId: String(userId) }),
  }).catch(() => {});
}

export async function validateTouchToken(userId, token) {
  // Touch validation is owned by CC Entry; slot proxies by accepting
  // and forwarding — this helper is only used on orchestrator historically.
  // Prefer Entry's /api/vibe/internal/touch. Kept for API compat.
  if (IS_LOCAL_PREVIEW) {
    return !!(token && process.env.VIBE_TOUCH_TOKEN && token === process.env.VIBE_TOUCH_TOKEN);
  }
  try {
    const res = await fetch(`${ENTRY}/__cc/preview/touch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: String(userId), token }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getPreviewInfo(userId) {
  if (IS_LOCAL_PREVIEW && String(userId) === String(LOCAL_USER_ID)) {
    return localPayload(LOCAL_WORKTREE);
  }
  // Sync helper used rarely; prefer ensure. Best-effort sync fetch is awkward —
  // return null and let callers that need live info use ensure/workspace.
  return null;
}

/** Async get for callers that can await. */
export async function fetchPreviewInfo(userId) {
  if (IS_LOCAL_PREVIEW && String(userId) === String(LOCAL_USER_ID)) {
    return localPayload(LOCAL_WORKTREE);
  }
  try {
    const body = await ccFetch(`/__cc/preview/${encodeURIComponent(String(userId))}`, {
      method: 'GET',
    });
    return {
      url: body.url || publicPreviewUrl(userId),
      port: body.port,
      backendPort: body.backendPort,
      worktreePath: body.worktreePath,
    };
  } catch {
    return null;
  }
}
