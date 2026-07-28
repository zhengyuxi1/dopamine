import { Router } from 'express';
import db from '../db.js';
import { parseProduct } from '../util/parse.js';

const router = Router();

// 商品列表（支持搜索 / 分类 / 排序）
router.get('/', (req, res) => {
  const { keyword, category_id, sort = 'default', page = 1, pageSize = 20 } = req.query;
  const p = Math.max(1, parseInt(page));
  const ps = Math.min(60, parseInt(pageSize));
  const offset = (p - 1) * ps;

  const where = [];
  const params = [];
  if (keyword) { where.push('title LIKE ?'); params.push(`%${keyword}%`); }
  if (category_id) { where.push('category_id = ?'); params.push(category_id); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  // 排除外卖商品
  if (where.length) {
    where.push('delivery_shop_id IS NULL');
  } else {
    where.push('delivery_shop_id IS NULL');
  }

  let order = 'ORDER BY created_at DESC';
  if (sort === 'sales') order = 'ORDER BY sales DESC';
  if (sort === 'price_asc') order = 'ORDER BY price ASC';
  if (sort === 'price_desc') order = 'ORDER BY price DESC';
  if (sort === 'rating') order = 'ORDER BY rating DESC';

  const total = db.prepare(`SELECT COUNT(*) as c FROM products ${whereSql}`).get(...params).c;
  const rows = db.prepare(`SELECT id, title, subtitle, price, original_price, cover, sales, rating, tags
    FROM products ${whereSql} ${order} LIMIT ? OFFSET ?`).all(...params, ps, offset);

  res.json({
    list: rows.map(parseProduct),
    total,
    page: p,
    pageSize: ps,
    hasMore: offset + rows.length < total,
  });
});

// 商品详情
router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(req.params.id);
  const reviewCount = db.prepare('SELECT COUNT(*) as c, AVG(rating) as avg FROM reviews WHERE product_id = ?')
    .get(req.params.id);
  res.json({
    ...parseProduct(p),
    reviews,
    reviewCount: reviewCount.c,
    reviewAvg: reviewCount.avg ? Number(reviewCount.avg).toFixed(1) : '5.0',
  });
});

// 猜你喜欢 / 推荐
router.get('/recommend/list', (_req, res) => {
  const rows = db.prepare(`SELECT id, title, subtitle, price, original_price, cover, sales, rating, tags
    FROM products WHERE delivery_shop_id IS NULL ORDER BY sales DESC, rating DESC LIMIT 20`).all();
  res.json(rows.map(parseProduct));
});

export default router;
