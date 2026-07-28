import { Router } from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import crypto from 'crypto';
import {
  ensureUserWorktree,
  gitInWorktree,
  captureVibeSnapshot,
  worktreeBranchFor,
} from '../vibe/worktree.js';
import {
  ensureUserPreview,
  touchPreview,
  fetchPreviewInfo,
  onPreviewStop,
  emitPreviewStop,
  validateTouchToken,
  uploadVibeMaterials,
} from '../vibe/preview.js';

const PREVIEW_UID_COOKIE = 'vibe_preview_uid';
import {
  buildLayoutImageContent,
  buildAssetReplaceContent,
} from '../vibe/uploads.js';
import { appendElementsToPrompt, normalizeElements } from '../vibe/elements.js';
import { getPicks, setPicks, clearPicks, clearAllPicksForUser } from '../vibe/picks.js';
import {
  acquirePublishLock,
  releasePublishLock,
  buildPublishPrompt,
} from '../vibe/publish.js';
const router = Router();
const IS_PREVIEW_BACKEND = process.env.VIBE_PREVIEW_BACKEND === '1';

// 使用 127.0.0.1：Windows 上 localhost 常解析为 ::1，而 WSL 转发的 CC 只听 IPv4
const CC_SERVER = process.env.CC_SERVER || 'http://127.0.0.1:4700';
const AUTH_TOKEN = process.env.CC_AUTH_TOKEN || 'vibe-dev-token';
const VIBE_AUTH_SECRET = process.env.VIBE_AUTH_SECRET || 'change-this-vibe-auth-secret';
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function verifyVibeTicket(ticket) {
  if (!ticket || typeof ticket !== 'string') return null;
  const dot = ticket.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = ticket.slice(0, dot);
  const sig = ticket.slice(dot + 1);
  const expect = crypto.createHmac('sha256', VIBE_AUTH_SECRET).update(body).digest('base64url');
  const a = Buffer.from(String(sig));
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const id = Number(payload?.id);
    if (payload?.kind !== 'identity' || !Number.isInteger(id) || id <= 0) return null;
    if (!Number.isFinite(Number(payload.exp)) || Date.now() > Number(payload.exp)) return null;
    return {
      id,
      username: String(payload.username || ''),
      nickname: String(payload.nickname || payload.username || ''),
    };
  } catch {
    return null;
  }
}

// UI session → CC session 映射（进程内复用，回合间保留对话上下文）
// key: `${userId}:${clientSessionId}` → { session_id, ws_url, cwd }
const ccSessions = new Map();

// 进行中的 chat 回合，供暂停/interrupt 使用
// key: `${userId}:${clientSessionId}` → { ws, interrupt }
const activeTurns = new Map();

function sessionKey(userId, clientSessionId) {
  return `${userId}:${clientSessionId}`;
}

const HISTORY_MAX_TURNS = 30;
const HISTORY_MAX_CHARS_PER_TURN = 2000;
const HISTORY_MAX_TOTAL_CHARS = 24000;

/**
 * 前端 localStorage 里的气泡历史 → 纯文本轮次（用于失效 transcript 补偿）。
 * 接受 { role: 'user'|'assistant'|'bot', text|content }。
 */
function normalizeChatHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  let total = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const roleRaw = item.role || item.type;
    const role =
      roleRaw === 'assistant' || roleRaw === 'bot'
        ? 'assistant'
        : roleRaw === 'user'
          ? 'user'
          : null;
    const textRaw =
      typeof item.text === 'string'
        ? item.text
        : typeof item.content === 'string'
          ? item.content
          : '';
    const text = textRaw.replace(/\s+/g, ' ').trim().slice(0, HISTORY_MAX_CHARS_PER_TURN);
    if (!role || !text) continue;
    if (total + text.length > HISTORY_MAX_TOTAL_CHARS) break;
    out.push({ role, text });
    total += text.length;
    if (out.length >= HISTORY_MAX_TURNS) break;
  }
  return out;
}

/** 将 UI 历史拼进当前 user 消息（仅在新建空 CC 会话时使用）。 */
function buildHistoryPreamble(history) {
  if (!history.length) return '';
  const lines = history.map((m) =>
    `${m.role === 'user' ? '用户' : '助手'}: ${m.text}`,
  );
  return (
    '【会话上下文补偿】原 CC session 已失效，以下是本 UI 会话此前的对话记录，请据此理解上下文；不要复述本段说明。\n\n' +
    lines.join('\n\n') +
    '\n\n【当前用户消息】\n'
  );
}

/**
 * Vibe worktree 隔离：CC 会话 cwd 已指向用户 worktree，禁止改主仓或其它备份。
 * @param {string} worktreePath
 */
function buildWorkspaceGuardPreamble(worktreePath) {
  const root = String(worktreePath || '').replace(/\/+$/, '');
  return (
    '<system-reminder>\n' +
    '【工作区约束】本会话已设置 cwd，只允许修改该目录内的项目代码。\n' +
    `cwd / 项目根：${root}\n` +
    '说明：这是用户专属 git worktree（主仓检出的一份工作副本）。预览站只读这份代码。\n' +
    '- Read / Edit / Write / Bash 改文件时：只用相对路径，或绝对路径必须以此 cwd 为前缀。\n' +
    '- 禁止改主仓（例如 …/dopamine/client、…/dopamine/server，且路径不含 /.claude/worktrees/）。\n' +
    '- 禁止改其它用户的 worktree（其它 vibe-u*）。\n' +
    '- 搜代码时从 cwd 起搜，不要从主仓根扫一遍再误改主仓文件。\n' +
    '改错目录后即使 DeployPreview 成功，用户预览也看不到改动。不要复述本段说明。\n' +
    '</system-reminder>\n\n'
  );
}

function prependTextToContent(content, preamble) {
  if (!preamble) return content;
  const blocks = Array.isArray(content) ? content.slice() : [];
  if (blocks.length && blocks[0]?.type === 'text' && typeof blocks[0].text === 'string') {
    blocks[0] = { ...blocks[0], text: preamble + blocks[0].text };
    return blocks;
  }
  return [{ type: 'text', text: preamble }, ...blocks];
}

/** 把 WS URL 里的 localhost 换成 127.0.0.1，避免 IPv6 连不上 */
function normalizeWsUrl(wsUrl) {
  try {
    const u = new URL(wsUrl);
    if (u.hostname === 'localhost') u.hostname = '127.0.0.1';
    return u.toString();
  } catch {
    return wsUrl.replace('://localhost', '://127.0.0.1');
  }
}

function ccWsUrlFor(sessionId) {
  const base = CC_SERVER.replace(/^http/, 'ws');
  return `${base}/ws/${sessionId}`;
}

async function createCCSession(cwd, opts = {}) {
  const body = {
    cwd,
    profile: 'coder',
    dangerously_skip_permissions: true,
  };
  if (opts.resume) {
    body.resume = opts.resume;
  }
  if (opts.resumeSessionAt) {
    body.resume_session_at = opts.resumeSessionAt;
  }
  if (opts.forkSession) {
    body.fork_session = true;
  }

  const ccRes = await fetch(`${CC_SERVER}/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!ccRes.ok) {
    let detail = '';
    try {
      const errBody = await ccRes.json();
      detail = errBody?.error ? `: ${errBody.error}` : '';
    } catch {}
    const err = new Error(`CC Server 错误: ${ccRes.status}${detail}`);
    err.status = 502;
    throw err;
  }
  const { session_id, ws_url } = await ccRes.json();
  return {
    session_id,
    ws_url: normalizeWsUrl(ws_url || ccWsUrlFor(session_id)),
    cwd,
  };
}

function deleteCCSession(session_id) {
  if (!session_id) return;
  fetch(`${CC_SERVER}/sessions/${session_id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
  }).catch(() => {});
}

/** Wait briefly for DELETE to drop the live process before re-resume. */
async function deleteCCSessionAndWait(session_id, timeoutMs = 3000) {
  if (!session_id) return;
  deleteCCSession(session_id);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!(await isCcSessionAlive(session_id))) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** 确认 CC session 仍存活，避免 dopamine/CC 重启后前端带回的 id 导致 WS 挂死 */
async function isCcSessionAlive(sessionId) {
  if (!sessionId) return false;
  try {
    const res = await fetch(`${CC_SERVER}/sessions`, {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const list = Array.isArray(data?.sessions) ? data.sessions : [];
    return list.some((s) => s && s.id === sessionId);
  } catch {
    return false;
  }
}

function throwResumeFailed(detail) {
  const err = new Error(detail || '原 CC 会话无法恢复');
  err.status = 409;
  err.code = 'CC_RESUME_FAILED';
  err.need_history = true;
  throw err;
}

/**
 * 获取或创建可复用的 CC 会话；cwd 必须落在用户 worktree。
 * 进程已死但有 preferCcSessionId 时优先 --resume。
 * resume 失败且请求未带 history → 抛 CC_RESUME_FAILED(409)，由前端附带历史重试。
 * 带 history 的补偿重试：一律新建空会话（不 resume），以便注入前端 UI 历史。
 * @param {{ hasHistory?: boolean }} [opts]
 */
async function getOrCreateCCSession(
  userId,
  clientSessionId,
  cwd,
  preferCcSessionId,
  preferWsUrl,
  opts = {},
) {
  const hasHistory = !!opts.hasHistory;
  const key = sessionKey(userId, clientSessionId);

  // 前端显式带 history：transcript/旧进程不可信 → 删旧、新建，强制走历史注入
  if (hasHistory) {
    const prevId = ccSessions.get(key)?.session_id || preferCcSessionId || null;
    dropCachedSession(userId, clientSessionId);
    if (prevId) await deleteCCSessionAndWait(prevId);
    const created = await createCCSession(cwd);
    ccSessions.set(key, created);
    return { ...created, reused: false, resumed: false };
  }

  let cached = ccSessions.get(key);

  // 服务重启后内存空了：仅当 CC 侧仍存在该 session 时才复用前端带回的 id
  if (!cached && preferCcSessionId) {
    if (await isCcSessionAlive(preferCcSessionId)) {
      cached = {
        session_id: preferCcSessionId,
        ws_url: normalizeWsUrl(preferWsUrl || ccWsUrlFor(preferCcSessionId)),
        cwd,
      };
      ccSessions.set(key, cached);
    }
  }

  if (cached) {
    // 若缓存的 cwd 与当前 worktree 不一致，强制重建
    if (cached.cwd && cached.cwd !== cwd) {
      deleteCCSession(cached.session_id);
      ccSessions.delete(key);
    } else if (!(await isCcSessionAlive(cached.session_id))) {
      const deadId = cached.session_id;
      ccSessions.delete(key);
      try {
        const resumed = await createCCSession(cwd, { resume: deadId });
        ccSessions.set(key, resumed);
        return { ...resumed, reused: false, resumed: true };
      } catch (e) {
        console.warn('[vibe] resume after dead cache failed:', e.message);
        throwResumeFailed(e.message);
      }
    } else {
      return { ...cached, reused: true, resumed: false };
    }
  }

  // 无 live 缓存：优先 resume；失败则 409 让前端带 history 重试
  if (preferCcSessionId) {
    const alive = await isCcSessionAlive(preferCcSessionId);
    if (alive) {
      const attached = {
        session_id: preferCcSessionId,
        ws_url: normalizeWsUrl(preferWsUrl || ccWsUrlFor(preferCcSessionId)),
        cwd,
      };
      ccSessions.set(key, attached);
      return { ...attached, reused: true, resumed: false };
    }

    try {
      const resumed = await createCCSession(cwd, { resume: preferCcSessionId });
      ccSessions.set(key, resumed);
      return { ...resumed, reused: false, resumed: true };
    } catch (e) {
      console.warn('[vibe] resume preferCcSessionId failed:', e.message);
      throwResumeFailed(e.message);
    }
  }

  const created = await createCCSession(cwd);
  ccSessions.set(key, created);
  return { ...created, reused: false, resumed: false };
}

function dropCachedSession(userId, clientSessionId, session_id) {
  const key = sessionKey(userId, clientSessionId);
  const cached = ccSessions.get(key);
  if (cached && (!session_id || cached.session_id === session_id)) {
    ccSessions.delete(key);
  }
}

function cleanupUserPreviewResources(userId) {
  // Preview stack stopped (idle / crash / stop API). Drop dopamine's live
  // session handles so the next chat re-resolves. Do NOT deleteCCSession or
  // interrupt an in-flight turn — DeployPreview blue/green must not look like
  // user pause, and killing CC mid-turn also splits LLM logs / forces resume.
  for (const [key] of [...ccSessions]) {
    if (key.startsWith(`${userId}:`)) {
      ccSessions.delete(key);
    }
  }
  clearAllPicksForUser(userId);
}

onPreviewStop(cleanupUserPreviewResources);

function requireVibeUser(req, res) {
  const identity = verifyVibeTicket(req.get('x-vibe-ticket'));
  if (!identity) {
    res.status(401).json({ error: '请先登录 VibeCoding' });
    return null;
  }
  req.vibeUser = identity;
  return identity.id;
}

/**
 * 主站 orchestrator：在主仓创建/复用 git worktree。
 * 预览后端：已在 worktree 进程内运行，禁止再次 worktree add（否则会报 vibe/uN already used）。
 */
function prepareUserWorkspace(userId) {
  if (IS_PREVIEW_BACKEND) {
    const path = process.env.VIBE_WORKTREE_PATH
      || resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    return {
      path: resolve(path),
      branch: worktreeBranchFor(userId),
      created: false,
    };
  }
  return ensureUserWorktree(PROJECT_ROOT, userId);
}

// GET /api/vibe/workspace
// 确保 per-user worktree + 预览 Vite，返回路径与预览 URL
router.get('/workspace', async (req, res) => {
  const userId = requireVibeUser(req, res);
  if (!userId) return;

  try {
    const wt = prepareUserWorkspace(userId);
    const preview = await ensureUserPreview(userId, wt.path);
    // 网关凭此 cookie 将 /api（非 vibe）与 /images 分流到用户沙盒后端
    if (!IS_PREVIEW_BACKEND) {
      res.cookie(PREVIEW_UID_COOKIE, String(userId), {
        path: '/',
        sameSite: 'lax',
        maxAge: 30 * 60 * 1000,
        httpOnly: false,
      });
    }
    res.json({
      worktreePath: wt.path,
      branch: wt.branch,
      previewUrl: preview.url,
      previewPort: preview.port,
      backendPort: preview.backendPort,
    });
  } catch (e) {
    console.error('[vibe] workspace failed:', e);
    res.status(500).json({ error: e.message || '工作区准备失败' });
  }
});

// GET /api/vibe/me — 只接受 CC Entry 注入的独立 Vibe 身份
router.get('/me', (req, res) => {
  const userId = requireVibeUser(req, res);
  if (!userId) return;
  const u = req.vibeUser;
  res.json({ id: u.id, username: u.username, nickname: u.nickname });
});

// POST /api/vibe/heartbeat — 预览页活跃心跳，延长空闲回收时间
router.post('/heartbeat', (req, res) => {
  const userId = requireVibeUser(req, res);
  if (!userId) return;
  touchPreview(userId);
  res.json({ ok: true });
});

// POST /api/vibe/internal/touch — 预览后端通知延长回收（转发 CC Entry 校验）
if (!IS_PREVIEW_BACKEND) {
  router.post('/internal/touch', async (req, res) => {
    const userId = req.body?.userId;
    const token = req.body?.token;
    if (!(await validateTouchToken(userId, token))) {
      return res.status(403).json({ error: '无效的内部令牌' });
    }
    touchPreview(userId);
    res.json({ ok: true });
  });

  // POST /api/vibe/internal/preview-stopped — CC Entry 在停预览时回调
  router.post('/internal/preview-stopped', (req, res) => {
    const userId = req.body?.userId;
    if (userId != null) emitPreviewStop(userId);
    res.json({ ok: true });
  });
}

// POST /api/vibe/interrupt — 暂停当前回合（向 CC 发 interrupt）
router.post('/interrupt', (req, res) => {
  const userId = requireVibeUser(req, res);
  if (!userId) return;

  const clientSessionId = typeof req.body?.sessionId === 'string' && req.body.sessionId.trim()
    ? req.body.sessionId.trim()
    : `user-${userId}`;
  const key = sessionKey(userId, clientSessionId);
  const turn = activeTurns.get(key);
  if (!turn) {
    return res.json({ ok: true, interrupted: false, reason: 'no_active_turn' });
  }
  try {
    turn.interrupt();
    res.json({ ok: true, interrupted: true });
  } catch (e) {
    res.status(500).json({ error: e.message || '暂停失败' });
  }
});

// GET/PUT /api/vibe/picks — 预览页与主站浮层同步 DOM 选区
router.get('/picks', (req, res) => {
  const userId = requireVibeUser(req, res);
  if (!userId) return;
  const sessionId = typeof req.query?.sessionId === 'string' && req.query.sessionId.trim()
    ? req.query.sessionId.trim()
    : `user-${userId}`;
  const entry = getPicks(userId, sessionId);
  res.json({
    elements: entry.elements,
    page_url: entry.pageUrl,
    updatedAt: entry.updatedAt,
  });
});

router.put('/picks', (req, res) => {
  const userId = requireVibeUser(req, res);
  if (!userId) return;
  const sessionId = typeof req.body?.sessionId === 'string' && req.body.sessionId.trim()
    ? req.body.sessionId.trim()
    : `user-${userId}`;
  const elements = normalizeElements(req.body?.elements);
  const pageUrl = typeof req.body?.page_url === 'string' ? req.body.page_url.trim() : '';
  const entry = setPicks(userId, sessionId, elements, pageUrl);
  res.json({ ok: true, updatedAt: entry.updatedAt, count: elements.length });
});

// POST /api/vibe/chat
// 校验权限 → worktree + cwd → 复用/创建 CC 会话 → 流式代理回复
router.post('/chat', async (req, res) => {
  const userId = requireVibeUser(req, res);
  if (!userId) return;

  const rawMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const elements = normalizeElements(req.body?.elements);
  const hasDesign = !!(req.body?.design_image && typeof req.body.design_image === 'object');
  const hasAssetsOnly = !hasDesign && Array.isArray(req.body?.assets) && req.body.assets.length > 0;
  const hasImages = hasDesign || hasAssetsOnly;
  const pageUrl = typeof req.body?.page_url === 'string' ? req.body.page_url.trim() : '';

  if (!rawMessage && !elements.length && !hasImages) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  const message = appendElementsToPrompt(
    rawMessage,
    elements,
    pageUrl || elements[0]?.page,
  );

  const clientSessionId = typeof req.body?.sessionId === 'string' && req.body.sessionId.trim()
    ? req.body.sessionId.trim()
    : `user-${userId}`;
  const preferCcSessionId = typeof req.body?.ccSessionId === 'string' && req.body.ccSessionId.trim()
    ? req.body.ccSessionId.trim()
    : null;
  const preferWsUrl = typeof req.body?.ccWsUrl === 'string' && req.body.ccWsUrl.trim()
    ? req.body.ccWsUrl.trim()
    : null;
  const chatHistory = normalizeChatHistory(req.body?.history);
  const hasHistory = chatHistory.length > 0;

  let worktreePath;
  let previewUrl = '';
  try {
    const wt = prepareUserWorkspace(userId);
    worktreePath = wt.path;
    // 预览与聊天并行不阻塞首字节：若已有则直接用，否则后台启动并在流里推送
    fetchPreviewInfo(userId)
      .then((existing) => {
        if (existing && existing.worktreePath === worktreePath) {
          previewUrl = existing.url;
          touchPreview(userId);
          return;
        }
        return ensureUserPreview(userId, worktreePath).then((p) => {
          previewUrl = p.url;
        });
      })
      .catch((e) => console.error('[vibe] preview start failed:', e.message));
  } catch (e) {
    console.error('[vibe] worktree failed:', e);
    return res.status(500).json({ error: `工作区准备失败: ${e.message}` });
  }

  let session_id;
  let rawWsUrl;
  let attempt = 0;
  /** 当前 CC 会话是空新建时，用前端 history 补偿上下文 */
  let needsHistoryCompensate = false;

  async function resolveSession(forceNew) {
    if (forceNew) {
      const prevId = session_id || preferCcSessionId;
      dropCachedSession(userId, clientSessionId);
      if (session_id) await deleteCCSessionAndWait(session_id);
      let created;
      let resumed = false;
      if (prevId) {
        try {
          created = await createCCSession(worktreePath, { resume: prevId });
          resumed = true;
        } catch (e) {
          console.warn('[vibe] forceNew resume failed, creating fresh:', e.message);
        }
      }
      if (!created) {
        // 流中恢复无法再让前端补 history；有则注入，无则空会话继续
        created = await createCCSession(worktreePath);
        resumed = false;
      }
      ccSessions.set(sessionKey(userId, clientSessionId), created);
      session_id = created.session_id;
      rawWsUrl = created.ws_url;
      needsHistoryCompensate = !resumed && hasHistory;
      return;
    }
    const sess = await getOrCreateCCSession(
      userId,
      clientSessionId,
      worktreePath,
      preferCcSessionId,
      preferWsUrl,
      { hasHistory },
    );
    session_id = sess.session_id;
    rawWsUrl = sess.ws_url;
    needsHistoryCompensate = !sess.reused && !sess.resumed && hasHistory;
  }

  try {
    await resolveSession(false);
  } catch (e) {
    if (e.code === 'CC_RESUME_FAILED' || e.status === 409) {
      return res.status(409).json({
        code: 'CC_RESUME_FAILED',
        need_history: true,
        error: e.message || '原 CC 会话无法恢复，请附带前端历史后重试',
      });
    }
    if (e.status === 502) return res.status(502).json({ error: e.message });
    return res.status(502).json({ error: `CC Server 不可达: ${e.message}` });
  }

  // Git 快照：仅有未提交变更时才 commit；干净则只记录当前 HEAD 供前端标记（不写空提交）
  let snapHash = '';
  let snapCommitted = false;
  try {
    const snap = captureVibeSnapshot(
      worktreePath,
      `vibe:snap-${session_id}-${Date.now()}`,
    );
    snapHash = snap.hash;
    snapCommitted = snap.committed;
  } catch (e) {
    console.error('[vibe] git snapshot failed:', e.message);
  }

  touchPreview(userId);

  // 主图交给视觉链路；仅素材先通过 CC Entry 上传 COS，只向模型传文件名和 URL。
  let promptContent = message.trim()
    ? [{ type: 'text', text: message }]
    : [];
  let materialAssets = [];
  try {
    if (req.body?.design_image && typeof req.body.design_image === 'object') {
      materialAssets = await uploadVibeMaterials([
        req.body.design_image,
        ...(Array.isArray(req.body.assets) ? req.body.assets : []),
      ]);
      const [uploadedDesign, ...uploadedAssets] = materialAssets;
      if (!uploadedDesign?.url) {
        throw new Error('主图上传 COS 失败')
      }
      const built = buildLayoutImageContent({
        userText: message,
        design_image: uploadedDesign,
        assets: uploadedAssets,
      });
      promptContent = built.content;
    } else if (Array.isArray(req.body?.assets) && req.body.assets.length) {
      materialAssets = await uploadVibeMaterials(req.body.assets);
      const built = buildAssetReplaceContent({
        userText: message,
        assets: materialAssets,
      });
      promptContent = built.content;
    }
  } catch (e) {
    return res.status(400).json({ error: e.message || '图片无效' });
  }

  if (!promptContent.length) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  if (elements.length) {
    clearPicks(userId, clientSessionId);
  }

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  safeWrite(res, JSON.stringify({
    type: 'snapshot',
    hash: snapHash,
    committed: snapCommitted,
  }) + '\n');
  safeWrite(res, JSON.stringify({
    type: 'workspace',
    worktreePath,
    previewUrl: previewUrl || '',
  }) + '\n');
  safeWrite(res, JSON.stringify({ type: 'cc_session', id: session_id, ws_url: rawWsUrl }) + '\n');
  if (materialAssets.length) {
    safeWrite(res, JSON.stringify({
      type: 'material_assets',
      assets: materialAssets.map(asset => ({
        name: asset.name,
        url: asset.url,
      })),
    }) + '\n');
  }

  let ws = null;
  let wsClosed = false;
  let turnDone = false;
  let recovering = false;
  let interrupted = false;
  let wsGen = 0;
  const turnKey = sessionKey(userId, clientSessionId);

  function cleanup() {
    if (wsClosed) return;
    wsClosed = true;
    if (activeTurns.get(turnKey)?.res === res) {
      activeTurns.delete(turnKey);
    }
    try { ws?.close(); } catch {}
  }

  function interruptTurn() {
    if (turnDone || wsClosed || interrupted) return;
    interrupted = true;
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'control_request',
          request_id: crypto.randomUUID(),
          request: { subtype: 'interrupt' },
        }));
      }
    } catch {}
    safeWrite(res, JSON.stringify({ type: 'interrupted' }) + '\n');
    safeWrite(res, JSON.stringify({ type: 'done' }) + '\n');
    safeEnd(res);
    cleanup();
  }

  activeTurns.set(turnKey, { ws: null, res, interrupt: interruptTurn });
  req.on('close', cleanup);

  function connectAndSend() {
    const myGen = ++wsGen;
    let opened = false;
    const wsUrl = new URL(rawWsUrl);
    wsUrl.searchParams.set('token', AUTH_TOKEN);

    ws = new WebSocket(wsUrl.toString());
    const turn = activeTurns.get(turnKey);
    if (turn && turn.res === res) turn.ws = ws;

    ws.addEventListener('open', () => {
      if (myGen !== wsGen || wsClosed || interrupted) return;
      opened = true;
      recovering = false;
      let contentToSend = prependTextToContent(
        promptContent,
        buildWorkspaceGuardPreamble(worktreePath),
      );
      if (needsHistoryCompensate) {
        // 只补偿一次，避免 WS 重连时重复塞入大段历史
        contentToSend = prependTextToContent(
          contentToSend,
          buildHistoryPreamble(chatHistory),
        );
        needsHistoryCompensate = false;
        console.log(
          `[vibe] history compensate: ${chatHistory.length} turns → session ${session_id}`,
        );
      }
      const msg = JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: contentToSend,
        },
        parent_tool_use_id: null,
        session_id: session_id || '',
        ...(typeof req.body?.userMessageUuid === 'string' &&
        req.body.userMessageUuid.trim()
          ? { uuid: req.body.userMessageUuid.trim() }
          : {}),
      });
      ws.send(msg);
    });

    ws.addEventListener('message', event => {
      if (myGen !== wsGen || wsClosed || turnDone || interrupted) return;

      const data = typeof event.data === 'string' ? event.data : '';
      const lines = data.split('\n').filter(l => l.trim());

      for (const line of lines) {
        if (turnDone || wsClosed) break;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }

        switch (msg.type) {
          case 'assistant': {
            if (msg.uuid) {
              safeWrite(res, JSON.stringify({
                type: 'msg_uuid',
                role: 'assistant',
                uuid: msg.uuid,
              }) + '\n');
            }
            const content = msg.message?.content || [];
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                safeWrite(res, JSON.stringify({ type: 'text', content: block.text }) + '\n');
              }
              if (block.type === 'tool_use') {
                const name = block.name || 'tool';
                let desc = name;
                if (block.input?.file_path) desc += ' ' + block.input.file_path;
                safeWrite(res, JSON.stringify({ type: 'tool', content: desc }) + '\n');
              }
            }
            break;
          }
          case 'user': {
            const content = msg.message?.content || [];
            if (content.some(block => block.type === 'tool_result')) {
              safeWrite(res, JSON.stringify({ type: 'tool_done' }) + '\n');
            }
            break;
          }
          case 'tool_result': {
            safeWrite(res, JSON.stringify({ type: 'tool_done' }) + '\n');
            break;
          }
          case 'stream_event': {
            if (msg.event?.type === 'content_block_delta' && msg.event?.delta?.type === 'text_delta') {
              safeWrite(res, JSON.stringify({ type: 'text', content: msg.event.delta.text }) + '\n');
            }
            break;
          }
          case 'control_request': {
            if (msg.request?.subtype === 'can_use_tool' && ws && myGen === wsGen) {
              const response = JSON.stringify({
                type: 'control_response',
                response: {
                  subtype: 'success',
                  request_id: msg.request_id,
                  response: {
                    behavior: 'allow',
                    updatedInput: msg.request?.input || {},
                  },
                },
              });
              ws.send(response);
            }
            break;
          }
          case 'result': {
            turnDone = true;
            // 回合结束时再推一次预览 URL（后台启动可能刚完成）
            fetchPreviewInfo(userId)
              .then((info) => {
                if (info?.url && !wsClosed) {
                  safeWrite(res, JSON.stringify({
                    type: 'workspace',
                    worktreePath,
                    previewUrl: info.url,
                  }) + '\n');
                }
              })
              .catch(() => {})
              .finally(() => {
                safeWrite(res, JSON.stringify({ type: 'done' }) + '\n');
                safeEnd(res);
                cleanup();
              });
            break;
          }
        }
      }
    });

    ws.addEventListener('close', (ev) => {
      if (myGen !== wsGen || wsClosed || turnDone || recovering || interrupted) return;

      const reason = (ev.reason || '').trim();
      const earlyCrash = opened && reason.includes('Subprocess exited');

      if ((!opened || earlyCrash) && attempt < 1) {
        attempt += 1;
        recovering = true;
        resolveSession(true)
          .then(() => {
            if (wsClosed) return;
            safeWrite(res, JSON.stringify({ type: 'cc_session', id: session_id, ws_url: rawWsUrl }) + '\n');
            connectAndSend();
          })
          .catch((e) => {
            recovering = false;
            safeWrite(res, JSON.stringify({ type: 'error', content: `CC 会话重建失败: ${e.message}` }) + '\n');
            safeEnd(res);
            cleanup();
          });
        return;
      }

      const detail = reason ? `WebSocket 连接中断: ${reason}` : 'WebSocket 连接中断';
      safeWrite(res, JSON.stringify({ type: 'error', content: detail }) + '\n');
      safeEnd(res);
      cleanup();
    });
  }

  try {
    connectAndSend();
  } catch (e) {
    safeWrite(res, JSON.stringify({ type: 'error', content: `连接 CC Server 失败: ${e.message}` }) + '\n');
    safeEnd(res);
    cleanup();
  }
});

// POST /api/vibe/publish — 专用 CC 会话：由 /publish skill 完成合并/push/构建/重启
router.post('/publish', async (req, res) => {
  if (IS_PREVIEW_BACKEND) {
    return res.status(404).json({ error: '请在主站发起发布' });
  }

  const userId = requireVibeUser(req, res);
  if (!userId) return;

  if (!acquirePublishLock()) {
    return res.status(409).json({ error: '已有发布任务进行中' });
  }

  let worktreePath;
  let branch;
  try {
    const wt = prepareUserWorkspace(userId);
    worktreePath = wt.path;
    branch = wt.branch;
  } catch (e) {
    releasePublishLock();
    console.error('[vibe] publish worktree failed:', e);
    return res.status(500).json({ error: `工作区准备失败: ${e.message}` });
  }

  const promptText = buildPublishPrompt({
    userId,
    branch,
    worktreePath,
    projectRoot: PROJECT_ROOT,
  });

  let session_id;
  let rawWsUrl;
  try {
    const created = await createCCSession(PROJECT_ROOT);
    session_id = created.session_id;
    rawWsUrl = created.ws_url;
  } catch (e) {
    releasePublishLock();
    if (e.status === 502) return res.status(502).json({ error: e.message });
    return res.status(502).json({ error: `CC Server 不可达: ${e.message}` });
  }

  const clientSessionId = '__publish__';
  const turnKey = sessionKey(userId, clientSessionId);
  let lockReleased = false;
  function releaseAll() {
    if (lockReleased) return;
    lockReleased = true;
    releasePublishLock();
    deleteCCSession(session_id);
  }

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  safeWrite(res, JSON.stringify({
    type: 'publish_start',
    branch,
    worktreePath,
  }) + '\n');

  let ws = null;
  let wsClosed = false;
  let turnDone = false;
  let interrupted = false;

  function cleanup() {
    if (wsClosed) return;
    wsClosed = true;
    if (activeTurns.get(turnKey)?.res === res) {
      activeTurns.delete(turnKey);
    }
    try { ws?.close(); } catch {}
    releaseAll();
  }

  function interruptTurn() {
    if (turnDone || wsClosed || interrupted) return;
    interrupted = true;
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'control_request',
          request_id: crypto.randomUUID(),
          request: { subtype: 'interrupt' },
        }));
      }
    } catch {}
    safeWrite(res, JSON.stringify({ type: 'interrupted' }) + '\n');
    safeWrite(res, JSON.stringify({ type: 'done' }) + '\n');
    safeEnd(res);
    cleanup();
  }

  activeTurns.set(turnKey, { ws: null, res, interrupt: interruptTurn });
  req.on('close', cleanup);

  try {
    const wsUrl = new URL(rawWsUrl);
    wsUrl.searchParams.set('token', AUTH_TOKEN);
    ws = new WebSocket(wsUrl.toString());
    const turn = activeTurns.get(turnKey);
    if (turn && turn.res === res) turn.ws = ws;

    ws.addEventListener('open', () => {
      if (wsClosed || interrupted) return;
      ws.send(JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: promptText }],
        },
        parent_tool_use_id: null,
        session_id: session_id || '',
      }));
    });

    ws.addEventListener('message', (event) => {
      if (wsClosed || turnDone || interrupted) return;
      const data = typeof event.data === 'string' ? event.data : '';
      const lines = data.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        if (turnDone || wsClosed) break;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }

        switch (msg.type) {
          case 'assistant': {
            const content = msg.message?.content || [];
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                safeWrite(res, JSON.stringify({ type: 'text', content: block.text }) + '\n');
              }
              if (block.type === 'tool_use') {
                const name = block.name || 'tool';
                let desc = name;
                if (block.input?.file_path) desc += ' ' + block.input.file_path;
                else if (block.input?.command) desc += ' ' + String(block.input.command).slice(0, 120);
                safeWrite(res, JSON.stringify({ type: 'tool', content: desc }) + '\n');
              }
            }
            break;
          }
          case 'user': {
            const content = msg.message?.content || [];
            if (content.some(block => block.type === 'tool_result')) {
              safeWrite(res, JSON.stringify({ type: 'tool_done' }) + '\n');
            }
            break;
          }
          case 'tool_result': {
            safeWrite(res, JSON.stringify({ type: 'tool_done' }) + '\n');
            break;
          }
          case 'stream_event': {
            if (msg.event?.type === 'content_block_delta' && msg.event?.delta?.type === 'text_delta') {
              safeWrite(res, JSON.stringify({ type: 'text', content: msg.event.delta.text }) + '\n');
            }
            break;
          }
          case 'control_request': {
            if (msg.request?.subtype === 'can_use_tool' && ws) {
              ws.send(JSON.stringify({
                type: 'control_response',
                response: {
                  subtype: 'success',
                  request_id: msg.request_id,
                  response: {
                    behavior: 'allow',
                    updatedInput: msg.request?.input || {},
                  },
                },
              }));
            }
            break;
          }
          case 'result': {
            turnDone = true;
            // 重启由 CC /publish skill 负责（publish-reload 蓝绿切换），此处不自行重启
            safeWrite(res, JSON.stringify({ type: 'done' }) + '\n');
            safeEnd(res);
            cleanup();
            break;
          }
        }
      }
    });

    ws.addEventListener('close', (ev) => {
      if (wsClosed || turnDone || interrupted) return;
      const reason = (ev.reason || '').trim();
      const detail = reason ? `WebSocket 连接中断: ${reason}` : 'WebSocket 连接中断';
      safeWrite(res, JSON.stringify({ type: 'error', content: detail }) + '\n');
      safeEnd(res);
      cleanup();
    });
  } catch (e) {
    safeWrite(res, JSON.stringify({ type: 'error', content: `连接 CC Server 失败: ${e.message}` }) + '\n');
    safeEnd(res);
    cleanup();
  }
});

// DELETE /api/vibe/session
router.delete('/session', (req, res) => {
  const userId = requireVibeUser(req, res);
  if (!userId) return;

  const clientSessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
  const ccSessionId = typeof req.body?.ccSessionId === 'string' ? req.body.ccSessionId.trim() : '';

  if (!clientSessionId && !ccSessionId) {
    return res.status(400).json({ error: '缺少 sessionId' });
  }

  if (clientSessionId) {
    const key = sessionKey(userId, clientSessionId);
    const cached = ccSessions.get(key);
    if (cached) {
      deleteCCSession(cached.session_id);
      ccSessions.delete(key);
    } else if (ccSessionId) {
      deleteCCSession(ccSessionId);
    }
  } else {
    deleteCCSession(ccSessionId);
    for (const [key, val] of ccSessions) {
      if (key.startsWith(`${userId}:`) && val.session_id === ccSessionId) {
        ccSessions.delete(key);
      }
    }
  }

  res.json({ ok: true });
});

// POST /api/vibe/rewind — 回滚 worktree（可选）；按 resumeSessionAt fork 截断 CC 上下文
router.post('/rewind', async (req, res) => {
  const userId = requireVibeUser(req, res);
  if (!userId) return;

  const { hash, skipGit } = req.body || {};
  const clientSessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
  const ccSessionId = typeof req.body?.ccSessionId === 'string' ? req.body.ccSessionId.trim() : '';
  const resumeSessionAt =
    typeof req.body?.resumeSessionAt === 'string' ? req.body.resumeSessionAt.trim() : '';

  let worktreePath = '';
  try {
    worktreePath = prepareUserWorkspace(userId).path;
  } catch (e) {
    return res.status(500).json({ error: `工作区准备失败: ${e.message}` });
  }

  let newCcSessionId = '';
  let newWsUrl = '';

  // Code and conversation must move together. Validate and restore the
  // worktree first so a Git failure cannot discard the user's CC context.
  if (!skipGit && hash != null && hash !== '') {
    if (typeof hash !== 'string') {
      return res.status(400).json({ error: '无效的 hash' });
    }
    if (hash !== 'HEAD' && !/^[a-f0-9]{7,40}$/i.test(hash)) {
      return res.status(400).json({ error: '无效的 hash' });
    }
    try {
      gitInWorktree(worktreePath, ['reset', '--hard', hash]);
      gitInWorktree(worktreePath, ['clean', '-fd']);
      touchPreview(userId);
    } catch (e) {
      return res.status(500).json({ error: `git reset 失败: ${e.message}` });
    }
  }

  const oldId = (() => {
    if (clientSessionId) {
      const cached = ccSessions.get(sessionKey(userId, clientSessionId));
      if (cached?.session_id) return cached.session_id;
    }
    return ccSessionId || '';
  })();

  if (oldId) {
    dropCachedSession(userId, clientSessionId, oldId);
    await deleteCCSessionAndWait(oldId);

    if (resumeSessionAt) {
      try {
        const created = await createCCSession(worktreePath, {
          resume: oldId,
          resumeSessionAt,
          forkSession: true,
        });
        if (clientSessionId) {
          ccSessions.set(sessionKey(userId, clientSessionId), created);
        }
        newCcSessionId = created.session_id;
        newWsUrl = created.ws_url;
      } catch (e) {
        console.warn('[vibe] rewind fork-resume failed:', e.message);
        // 截断失败则保持无 CC 会话（下次聊天会新建）；不把旧全文带回去
      }
    }
  } else if (ccSessionId) {
    deleteCCSession(ccSessionId);
    for (const [key, val] of ccSessions) {
      if (key.startsWith(`${userId}:`) && val.session_id === ccSessionId) {
        ccSessions.delete(key);
      }
    }
  }

  const payload = {
    ok: true,
    ccReset: true,
    ...(newCcSessionId
      ? { ccSessionId: newCcSessionId, ws_url: newWsUrl }
      : {}),
  };

  if (skipGit || hash == null || hash === '') {
    return res.json({ ...payload, skipped: true });
  }
  res.json({ ...payload, hash, worktreePath });
});

function safeWrite(res, chunk) {
  try { res.write(chunk); } catch {}
}

function safeEnd(res) {
  try { res.end(); } catch {}
}

export default router;
