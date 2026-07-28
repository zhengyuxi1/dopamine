# Dopamine Shop 多巴胺商店 🛍️

一个移动端虚拟购物网站，复刻真实购物 APP 的完整体验。所有购物流程都会复刻：浏览、搜索、加购、下单、订单管理 —— **但无需付款，用户也不会收到商品**。

## ✨ 特性

- 📱 移动端优先 UI，仿主流购物 APP 体验
- 👤 用户注册 / 登录（本地会话，无需真实鉴权）
- 🏠 首页：轮播 Banner、分类导航、商品推荐、限时秒杀
- 🗂️ 分类浏览、商品筛选、搜索
- 📦 商品详情：图片、规格、评价、加购 / 收藏
- 🛒 购物车：增删改、选中结算
- 🧾 下单流程：地址管理、订单确认、提交（无需付款）
- 📋 订单列表 / 订单详情 / 模拟发货 / 确认收货
- ❤️ 收藏夹
- 👤 个人中心

## 🛠 技术栈

- 后端：Node.js + Express + better-sqlite3（SQLite）
- 前端：React 18 + Vite + React Router + Axios
- 移动端适配：viewport + rem/vw，触控交互

## 🚀 快速开始

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 构建前端（主站 slot 用 vite preview）
npm run build

# 3. 启动（**必须用 root**）：CC Entry + 蓝槽
#    ops 在 /opt/cc-source（claude-run 不可读）；子进程会 drop 到 claude-run
#    见 CC/ops/dopamine/README.md
```

对外入口：http://127.0.0.1:4001/  
编排由 root 跑 `CC/ops/dopamine`；商城与预览进程以 `claude-run` 运行。

VibeCoding 使用 CC Entry 提供的独立登录（`/__vibe/login`、`vibe.sid`），
不复用商城登录的 `dop.sid`，也不读取 `shop.db.users` 作为 Vibe 账号来源。
Vibe 账号由 root 可读的 `VIBE_ACCOUNTS_FILE` JSON 文件登记。

VibeCoding 完整工作台由 Entry 的 `/__vibe/workspace` 提供，用户预览
`/p/{id}/` 运行在工作台 iframe 中。预览刷新、HMR 或进程重启不会刷新父级
聊天界面。Dopamine worktree 只注入 Entry 托管的选区桥接脚本，不再包含或
提供可由用户 Agent 修改的 Vibe 浮窗源码。

发布切换（root）：`DOPAMINE_ROOT=/home/claude-run/dopamine node /opt/cc-source/ops/dopamine/publish-reload.mjs`

## 📁 项目结构

```
dopamine/
├── package.json          # 根脚本（同时启动前后端）
├── CLAUDE.md             # 给编码 Agent 的项目约定（必读）
├── server/               # Express + SQLite 后端
│   ├── src/
│   │   ├── db.js         # 仅打开 shop.db 并导出连接（不建表、不灌种子）
│   │   ├── app.js        # Express 应用
│   │   └── routes/       # API 路由（只读/写已有表，不在此 CREATE / seed）
│   ├── migrations/       # Agent 触发的所有数据库变更
│   └── shop.db           # 受版本控制的预览基准库，禁止在 VibeCoding 中直接修改
└── client/               # Vite + React 前端
    └── src/
        ├── api/          # axios 封装
        ├── components/   # 通用组件
        ├── pages/        # 页面
        ├── store/        # 状态管理
        └── styles/       # 全局样式
```

## 🗄 数据库约定

- **`server/shop.db`** 是受版本控制的预览基准库。VibeCoding 不得直接修改它，发布时也不得用该二进制文件覆盖正式数据库。
- 所有由 Agent 触发的数据库变更，无论结构还是数据，也无论用户是否明确提到发布，都必须在 **`server/migrations/`** 中新增包含真实 SQL 的顺序编号 migration；Agent 禁止直接写入任何数据库文件。
- migration 只允许向前新增，禁止修改已执行的文件或添加占位 migration；新增后使用 `DeployPreview(target: "server")` 交给 CC Entry 在独立预览数据库中执行和验证。
- **`server/src/db.js`** 只负责连接；缺文件直接报错，**不要**在启动或路由里 `CREATE TABLE` / 灌种子。
- 空库查询应返回空结果；业务路由只假设表已存在。

## ⚠️ 说明

本项目目的是让用户体验购物的快乐，**所有商品均为虚拟数据**，下单后不会产生真实交易，也不会发货。订单中的"发货 / 收货"状态为模拟流程。
