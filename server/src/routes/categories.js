import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort ASC').all();
  res.json(rows);
});

// 分类下商品
router.get('/:id/products', (req, res) => {
  const { id } = req.params;
  const { sort = 'default', keyword } = req.query;
  let order = 'ORDER BY created_at DESC';
  if (sort === 'sales') order = 'ORDER BY sales DESC';
  if (sort === 'price_asc') order = 'ORDER BY price ASC';
  if (sort === 'price_desc') order = 'ORDER BY price DESC';
  let sql = `SELECT id, title, subtitle, price, original_price, cover, sales, rating, tags
    FROM products WHERE category_id = ?`;
  const params = [id];
  if (keyword) {
    sql += ' AND title LIKE ?';
    params.push(`%${keyword}%`);
  }
  sql += ' ' + order;
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(parseTags));
});

export default router;

function parseTags(p) {
  try { p.tags = JSON.parse(p.tags || '[]'); } catch { p.tags = []; }
  return p;
}
