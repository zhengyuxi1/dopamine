import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// 收藏列表
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT f.id as fav_id, f.created_at,
    p.id, p.title, p.subtitle, p.price, p.original_price, p.cover, p.sales, p.rating
    FROM favorites f JOIN products p ON f.product_id = p.id
    WHERE f.user_id = ? ORDER BY f.id DESC`).all(req.session.userId);
  res.json(rows);
});

// 收藏 / 取消收藏（toggle）
router.post('/:productId', (req, res) => {
  const { productId } = req.params;
  const uid = req.session.userId;
  const exists = db.prepare('SELECT id FROM favorites WHERE user_id=? AND product_id=?').get(uid, productId);
  if (exists) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(exists.id);
    return res.json({ favorited: false });
  }
  db.prepare('INSERT INTO favorites(user_id, product_id) VALUES (?,?)').run(uid, productId);
  res.json({ favorited: true });
});

// 检查是否已收藏
router.get('/:productId/status', (req, res) => {
  const exists = db.prepare('SELECT id FROM favorites WHERE user_id=? AND product_id=?')
    .get(req.session.userId, req.params.productId);
  res.json({ favorited: !!exists });
});

export default router;
