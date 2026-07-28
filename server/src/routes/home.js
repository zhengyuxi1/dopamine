import { Router } from 'express';
import db from '../db.js';

const router = Router();

// 首页聚合数据
router.get('/', (_req, res) => {
  const banners = db.prepare('SELECT * FROM banners ORDER BY sort ASC').all();
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort ASC').all();
  const delivery = db.prepare(`
    SELECT id, name, cover, rating, sales, delivery_fee, min_order, delivery_time, distance, tags
    FROM delivery_shops WHERE is_open = 1 ORDER BY sales DESC LIMIT 6
  `).all().map(s => {
    try { s.tags = JSON.parse(s.tags || '[]'); } catch { s.tags = []; }
    return s;
  });
  const recommend = db.prepare(`SELECT id, title, subtitle, price, original_price, cover, sales, rating
    FROM products WHERE delivery_shop_id IS NULL ORDER BY sales DESC, rating DESC LIMIT 12`).all();
  res.json({ banners, categories, delivery, recommend });
});

export default router;
