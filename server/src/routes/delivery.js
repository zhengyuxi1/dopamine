import { Router } from 'express';
import db from '../db.js';

const router = Router();

// 附近外卖店铺列表
router.get('/shops', (_req, res) => {
  const shops = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM products WHERE delivery_shop_id = s.id) AS menu_count
    FROM delivery_shops s WHERE s.is_open = 1 ORDER BY s.sales DESC
  `).all();
  res.json(shops.map(s => {
    try { s.tags = JSON.parse(s.tags || '[]'); } catch { s.tags = []; }
    return s;
  }));
});

// 店铺详情 + 菜单
router.get('/shops/:id', (req, res) => {
  const shop = db.prepare('SELECT * FROM delivery_shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ error: '店铺不存在' });

  try { shop.tags = JSON.parse(shop.tags || '[]'); } catch { shop.tags = []; }

  const menu = db.prepare(`
    SELECT id, title, subtitle, price, original_price, cover, sales, rating, tags, stock
    FROM products WHERE delivery_shop_id = ? ORDER BY sales DESC
  `).all(req.params.id);

  menu.forEach(p => {
    try { p.tags = JSON.parse(p.tags || '[]'); } catch { p.tags = []; }
  });

  res.json({ ...shop, menu });
});

export default router;
