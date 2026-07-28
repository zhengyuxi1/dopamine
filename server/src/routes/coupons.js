import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// 可领取的优惠券列表（排除已领完的）
router.get('/', (req, res) => {
  const uid = req.session.userId;
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM user_coupons WHERE coupon_id = c.id AND user_id = ?) as user_claimed
    FROM coupons c
    WHERE c.total = 0 OR c.claimed < c.total
    ORDER BY c.id
  `).all(uid);
  res.json(rows);
});

// 领取优惠券
router.post('/:id/claim', (req, res) => {
  const uid = req.session.userId;
  const { id } = req.params;

  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
  if (!coupon) return res.status(404).json({ error: '优惠券不存在' });

  // 检查是否已领取
  const existing = db.prepare('SELECT id FROM user_coupons WHERE user_id=? AND coupon_id=?')
    .get(uid, id);
  if (existing) return res.status(400).json({ error: '已领取过该优惠券' });

  // 检查总量
  if (coupon.total > 0 && coupon.claimed >= coupon.total) {
    return res.status(400).json({ error: '优惠券已领完' });
  }

  const insert = db.transaction(() => {
    db.prepare('INSERT INTO user_coupons(user_id, coupon_id) VALUES (?,?)').run(uid, id);
    db.prepare('UPDATE coupons SET claimed = claimed + 1 WHERE id = ?').run(id);
  });
  insert();

  res.json({ ok: true, message: '领取成功' });
});

// 我的优惠券
router.get('/my', (req, res) => {
  const rows = db.prepare(`
    SELECT uc.id as uc_id, uc.status, uc.claimed_at, uc.used_at,
      c.id as coupon_id, c.title, c.subtitle, c.type, c.condition_amount, c.value, c.bg_color
    FROM user_coupons uc
    JOIN coupons c ON uc.coupon_id = c.id
    WHERE uc.user_id = ?
    ORDER BY uc.id DESC
  `).all(req.session.userId);
  res.json(rows);
});

// 优惠券数量统计
router.get('/count', (req, res) => {
  const r = db.prepare("SELECT COUNT(*) as c FROM user_coupons WHERE user_id=? AND status='unused'")
    .get(req.session.userId);
  res.json({ count: r.c });
});

export default router;
