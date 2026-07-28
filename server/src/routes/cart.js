import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { parseProduct } from '../util/parse.js';

const router = Router();
router.use(requireAuth);

// 购物车列表
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT c.id as cart_id, c.quantity, c.selected, c.sku,
    p.id, p.title, p.subtitle, p.price, p.original_price, p.cover, p.stock,
    cat.name as category_name
    FROM carts c JOIN products p ON c.product_id = p.id
    LEFT JOIN categories cat ON p.category_id = cat.id
    WHERE c.user_id = ? ORDER BY c.id DESC`).all(req.session.userId);
  res.json(rows.map(r => ({ ...r, ...parseProduct({ ...r }) })));
});

// 加入购物车
router.post('/', (req, res) => {
  const { product_id, quantity = 1, sku } = req.body;
  const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: '商品不存在' });
  const existing = db.prepare('SELECT * FROM carts WHERE user_id=? AND product_id=? AND sku IS ?')
    .get(req.session.userId, product_id, sku ?? null);
  if (existing) {
    db.prepare('UPDATE carts SET quantity = quantity + ? WHERE id = ?')
      .run(quantity, existing.id);
  } else {
    db.prepare('INSERT INTO carts(user_id, product_id, quantity, sku) VALUES (?,?,?,?)')
      .run(req.session.userId, product_id, quantity, sku ?? null);
  }
  res.json({ ok: true });
});

// 修改数量
router.put('/:id', (req, res) => {
  const { quantity, selected } = req.body;
  const updates = [];
  const params = [];
  if (quantity !== undefined) { updates.push('quantity = ?'); params.push(Math.max(1, quantity)); }
  if (selected !== undefined) { updates.push('selected = ?'); params.push(selected ? 1 : 0); }
  if (!updates.length) return res.json({ ok: true });
  params.push(req.params.id, req.session.userId);
  db.prepare(`UPDATE carts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  res.json({ ok: true });
});

// 删除
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM carts WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

// 批量删除
router.post('/delete-batch', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.json({ ok: true });
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM carts WHERE id IN (${placeholders}) AND user_id = ?`)
    .run(...ids, req.session.userId);
  res.json({ ok: true });
});

// 全选 / 取消全选
router.post('/select-all', (req, res) => {
  const { selected } = req.body;
  db.prepare('UPDATE carts SET selected = ? WHERE user_id = ?').run(selected ? 1 : 0, req.session.userId);
  res.json({ ok: true });
});

// 购物车统计
router.get('/count', (req, res) => {
  const r = db.prepare('SELECT COALESCE(SUM(quantity),0) as c FROM carts WHERE user_id = ?')
    .get(req.session.userId);
  res.json({ count: r.c });
});

export default router;
