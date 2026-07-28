# Dopamine — Agent 约定

## VibeCoding worktree（重要）

会话若已设置 `cwd`（通常为 `.claude/worktrees/vibe-u{用户id}/`）：

- **只改该 cwd 下的代码**。它是主仓的一份 worktree 副本；预览站也只跑这份。
- **禁止**改主仓路径（`…/dopamine/client`、`…/dopamine/server` 等且不含 `/.claude/worktrees/`）。
- **禁止**改其它 `vibe-u*` worktree。
- 搜索/编辑请从 cwd 出发；不要扫到主仓再误改主仓文件。

## 数据库（重要）

- `server/shop.db` 是受版本控制的**基准库**。VibeCoding 期间禁止直接对它执行 `CREATE`、`ALTER`、`DROP`、`INSERT`、`UPDATE` 或 `DELETE`；发布时也绝不能用 worktree 中的二进制数据库覆盖正式数据库。
- 所有由 Agent 触发的数据库变更，无论是表结构还是数据内容，也无论用户是否明确提到发布，都必须在 `server/migrations/` 下新增一个包含真实 SQL 的顺序编号 migration 文件。禁止 Agent 以任何方式直接写入基准库、独立预览库或正式数据库。
- migration 只允许向前新增；禁止修改已经存在或已经执行过的 migration，禁止用注释、`SELECT 1` 等占位内容代替真实变更。
- migration 中禁止自行使用 `BEGIN`、`COMMIT`、`ROLLBACK`、`VACUUM`；事务、校验、备份和执行由 CC Entry 统一负责。
- 新增 migration 后必须调用 `DeployPreview`，传当前 `userId`、`worktreePath` 和 `target: "server"`。只有执行成功并在预览站验证后，才能告诉用户变更已经完成。
- `server/src/db.js`：**只**打开 SQLite 并 `export default db`。禁止在此建表、迁移、灌种子。
- 路由 / 中间件：只对**已有表**做正常业务读写。禁止 `CREATE TABLE`、`ALTER TABLE`、`seedIfEmpty`、启动时 INSERT 演示数据、`/populate` 一类灌数或迁移逻辑。
- 空表时 API 正常返回 `[]` / 空对象即可，不要自动补数据。

## 其它

- 改页面上展示的「库里的字」或执行任何其它数据库变更 → 新增包含真实 SQL 的 migration，不要直接改任何数据库文件，也不要改 `db.js`。
- 改接口行为、校验、排序、字段计算 → 改 `server/src/routes/*` 等业务代码。
