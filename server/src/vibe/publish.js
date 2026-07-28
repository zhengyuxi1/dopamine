/**
 * VibeCoding publish — 主站只负责开 CC 会话并带上用户上下文；
 * 流程细节全部由 CC 内置 /publish skill 执行。
 */

/** 全局发布锁：同一时刻只允许一次 publish */
let publishing = false;

export function acquirePublishLock() {
  if (publishing) return false;
  publishing = true;
  return true;
}

export function releasePublishLock() {
  publishing = false;
}

/**
 * 仅传递发布对象；规则以 CC /publish skill 为准。
 * @param {{ userId: number|string, branch: string, worktreePath: string, projectRoot: string }} opts
 */
export function buildPublishPrompt({ userId, branch, worktreePath, projectRoot }) {
  return [
    '请使用 /publish skill 完成本次发布（先 Skill 加载 publish，或 /publish）。',
    '',
    `userId: ${userId}`,
    `branch: ${branch}`,
    `worktreePath: ${worktreePath}`,
    `projectRoot: ${projectRoot}`,
  ].join('\n');
}
