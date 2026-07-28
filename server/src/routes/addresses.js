import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(req.session.userId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, phone, province, city, district, detail, is_default } = req.body;
  if (!name || !phone || !detail) return res.status(400).json({ error: '姓名、电话、详细地址必填' });
  if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });
  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.session.userId);
  }
  const r = db.prepare(`INSERT INTO addresses(user_id, name, phone, province, city, district, detail, is_default)
    VALUES (?,?,?,?,?,?,?,?)`).run(req.session.userId, name, phone, province, city, district, detail, is_default ? 1 : 0);
  res.json({ id: r.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, phone, province, city, district, detail, is_default } = req.body;
  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.session.userId);
  }
  db.prepare(`UPDATE addresses SET name=?, phone=?, province=?, city=?, district=?, detail=?, is_default=?
    WHERE id=? AND user_id=?`)
    .run(name, phone, province, city, district, detail, is_default ? 1 : 0, req.params.id, req.session.userId);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

export default router;
