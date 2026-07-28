import { Router } from 'express';
import db from '../db.js';

const router = Router();

// 注册
router.post('/register', (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: '用户名已存在' });
  const r = db.prepare('INSERT INTO users(username, password, nickname, vibe_coding) VALUES (?,?,?,?)')
    .run(username, password, nickname || username, 1);
  req.session.userId = r.lastInsertRowid;
  res.json({ id: r.lastInsertRowid, username, nickname: nickname || username });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const u = db.prepare('SELECT id, username, nickname, avatar FROM users WHERE username=? AND password=?')
    .get(username, password);
  if (!u) return res.status(400).json({ error: '用户名或密码错误' });
  req.session.userId = u.id;
  res.json(u);
});

// 登出
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// 当前用户
router.get('/me', (req, res) => {
  if (!req.session?.userId) return res.json(null);
  const u = db.prepare('SELECT id, username, nickname, avatar FROM users WHERE id=?')
    .get(req.session.userId);
  res.json(u);
});

export default router;
