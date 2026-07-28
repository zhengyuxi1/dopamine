import { existsSync, mkdirSync, symlinkSync, lstatSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { execFileSync } from 'child_process';

const SYMLINK_DIRS = ['node_modules', 'client/node_modules', 'server/node_modules'];

/**
 * Per-user git worktree under <repo>/.claude/worktrees/vibe-u{userId}/
 * Branch: vibe/u{userId}
 */
export function worktreeSlug(userId) {
  const id = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `vibe-u${id}`;
}

export function worktreePathFor(projectRoot, userId) {
  return join(projectRoot, '.claude', 'worktrees', worktreeSlug(userId));
}

export function worktreeBranchFor(userId) {
  return `vibe/u${String(userId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function git(projectRoot, args, opts = {}) {
  return execFileSync('git', ['-C', projectRoot, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  }).toString().trim();
}

function isValidWorktree(worktreePath) {
  try {
    git(worktreePath, ['rev-parse', '--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}

/** @returns {{ path: string, branch?: string, head?: string }[]} */
function listWorktrees(projectRoot) {
  let raw = '';
  try {
    raw = git(projectRoot, ['worktree', 'list', '--porcelain']);
  } catch {
    return [];
  }
  const entries = [];
  let cur = {};
  for (const line of raw.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (cur.path) entries.push(cur);
      cur = { path: line.slice(9) };
    } else if (line.startsWith('HEAD ')) {
      cur.head = line.slice(5);
    } else if (line.startsWith('branch ')) {
      cur.branch = line.slice(7);
    }
  }
  if (cur.path) entries.push(cur);
  return entries;
}

function findWorktreeByBranch(projectRoot, branch) {
  const ref = `refs/heads/${branch}`;
  return listWorktrees(projectRoot).find((w) => w.branch === ref);
}

function removeWorktree(projectRoot, wtPath) {
  try {
    git(projectRoot, ['worktree', 'remove', '--force', wtPath]);
  } catch {
    try {
      git(projectRoot, ['worktree', 'remove', wtPath]);
    } catch {}
  }
  // 目录被手动删除后，registration 仍残留，需 prune 才能再次 worktree add
  try {
    git(projectRoot, ['worktree', 'prune']);
  } catch {}
}

function repairWorktree(projectRoot) {
  try {
    git(projectRoot, ['worktree', 'repair']);
  } catch {}
  try {
    git(projectRoot, ['worktree', 'prune']);
  } catch {}
}

function ensureSymlinks(projectRoot, worktreePath) {
  for (const rel of SYMLINK_DIRS) {
    const source = join(projectRoot, rel);
    const dest = join(worktreePath, rel);
    if (!existsSync(source)) continue;
    try {
      const st = lstatSync(dest);
      if (st.isSymbolicLink() || st.isDirectory()) continue;
    } catch {
      // dest missing — create below
    }
    try {
      mkdirSync(dirname(dest), { recursive: true });
    } catch {}
    try {
      // Windows: 'junction' does not need admin; Unix: 'dir'
      const type = process.platform === 'win32' ? 'junction' : 'dir';
      symlinkSync(source, dest, type);
    } catch (e) {
      if (e.code !== 'EEXIST') {
        console.warn(`[vibe/worktree] symlink ${rel} failed:`, e.message);
      }
    }
  }
}

/**
 * Create or resume the per-user worktree. Returns absolute path.
 */
export function ensureUserWorktree(projectRoot, userId) {
  const root = resolve(projectRoot);
  const slug = worktreeSlug(userId);
  const wtPath = worktreePathFor(root, userId);
  const branch = worktreeBranchFor(userId);
  const wtResolved = resolve(wtPath);

  if (isValidWorktree(wtPath)) {
    ensureSymlinks(root, wtPath);
    return { path: wtPath, branch, created: false };
  }

  // 分支已被 git 注册到其他/同一路径的 worktree，避免重复 worktree add
  const registered = findWorktreeByBranch(root, branch);
  if (registered) {
    const regPath = resolve(registered.path);
    if (regPath === wtResolved) {
      repairWorktree(root);
      if (isValidWorktree(wtPath)) {
        ensureSymlinks(root, wtPath);
        return { path: wtPath, branch, created: false };
      }
      console.warn(`[vibe/worktree] stale worktree ${slug}, recreating`);
      removeWorktree(root, wtPath);
    } else if (isValidWorktree(regPath)) {
      ensureSymlinks(root, regPath);
      console.warn(`[vibe/worktree] reusing registered worktree ${slug} → ${regPath}`);
      return { path: regPath, branch, created: false };
    } else {
      removeWorktree(root, regPath);
    }
  }

  mkdirSync(join(root, '.claude', 'worktrees'), { recursive: true });

  let branchExists = false;
  try {
    git(root, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);
    branchExists = true;
  } catch {
    branchExists = false;
  }

  function addWorktree() {
    if (branchExists) {
      git(root, ['worktree', 'add', wtPath, branch]);
    } else {
      git(root, ['worktree', 'add', '-b', branch, wtPath]);
    }
  }

  try {
    addWorktree();
  } catch (e) {
    const msg = e.stderr?.toString?.() || e.message || String(e);
    if (msg.includes('already used by worktree')) {
      // 目录已删但 git 仍登记：清掉残留后重试一次
      const again = findWorktreeByBranch(root, branch);
      if (again) removeWorktree(root, again.path);
      else {
        removeWorktree(root, wtPath);
        repairWorktree(root);
      }
      if (isValidWorktree(wtPath)) {
        ensureSymlinks(root, wtPath);
        return { path: wtPath, branch, created: false };
      }
      const reuse = findWorktreeByBranch(root, branch);
      if (reuse && isValidWorktree(reuse.path)) {
        ensureSymlinks(root, reuse.path);
        return { path: resolve(reuse.path), branch, created: false };
      }
      try {
        addWorktree();
      } catch (e2) {
        const msg2 = e2.stderr?.toString?.() || e2.message || String(e2);
        throw new Error(`创建 worktree failed (${slug}): ${msg2}`);
      }
    } else if (existsSync(wtPath) && isValidWorktree(wtPath)) {
      ensureSymlinks(root, wtPath);
      return { path: wtPath, branch, created: false };
    } else {
      throw new Error(`创建 worktree failed (${slug}): ${msg}`);
    }
  }

  ensureSymlinks(root, wtPath);
  console.log(`[vibe/worktree] ready ${slug} → ${wtPath}`);
  return { path: wtPath, branch, created: true };
}

export function gitInWorktree(worktreePath, args) {
  return execFileSync('git', ['-C', worktreePath, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).toString().trim();
}

/**
 * 回合开始前的 rewind 锚点：仅有未提交变更时才创建 vibe commit，干净工作区不写空提交。
 * @returns {{ hash: string, committed: boolean }}
 */
export function captureVibeSnapshot(worktreePath, commitMessage) {
  const dirty = gitInWorktree(worktreePath, ['status', '--porcelain']);
  let committed = false;
  if (dirty) {
    gitInWorktree(worktreePath, ['add', '-A']);
    gitInWorktree(worktreePath, ['commit', '-m', commitMessage]);
    committed = true;
  }
  const hash = gitInWorktree(worktreePath, ['rev-parse', 'HEAD']);
  return { hash, committed };
}
