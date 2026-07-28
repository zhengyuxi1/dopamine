import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const STATUS_LABEL = {
  pending: '待付款',
  paid: '待发货',
  shipped: '待收货',
  received: '已完成',
  cancelled: '已取消',
};

const AUTO_SHIP_SECONDS = 15;
const COURIERS = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '极兔速递'];
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉'];
const pad = (n) => String(n).padStart(2, '0');

function genOrderNo() {
  const d = new Date();
  const ts = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return ts + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

function generateTracking(updatedAt) {
  const courier = COURIERS[Math.floor(Math.random() * COURIERS.length)];
  const prefix = courier === '顺丰速运' ? 'SF' : courier === '中通快递' ? 'ZT' : courier === '圆通速递' ? 'YT' : courier === '韵达快递' ? 'YD' : 'JT';
  const trackingNo = prefix + String(Math.floor(Math.random() * 1e10)).padStart(10, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const parseLocal = (s) => { const [y,mo,d,h,mi,se] = s.split(/[-: ]/).map(Number); return new Date(y,mo-1,d,h,mi,se); };
  const now = new Date();
  const paidAt = parseLocal(updatedAt);
  const halfWay = new Date(paidAt.getTime() + (now - paidAt.getTime()) / 2);
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  return JSON.stringify({
    courier,
    tracking_no: trackingNo,
    events: [
      { time: fmt(paidAt), desc: '包裹已揽收' },
      { time: fmt(halfWay), desc: `已到达${city}中转中心` },
      { time: fmt(now), desc: '运输中，即将派送' },
    ],
  });
}

function tryAutoShip(order) {
  if (!order || order.status !== 'paid') return order;
  const elapsed = db.prepare("SELECT strftime('%s','now','localtime') - strftime('%s',?) AS sec").get(order.updated_at).sec;
  if (elapsed < AUTO_SHIP_SECONDS) return order;
  const tracking = generateTracking(order.updated_at);
  db.prepare("UPDATE orders SET status='shipped', tracking=?, updated_at=datetime('now','localtime') WHERE id=?")
    .run(tracking, order.id);
  return { ...order, status: 'shipped', tracking, statusLabel: '待收货' };
}

// 创建订单
router.post('/', (req, res) => {
  const { address_id, items, remark, from_cart = true } = req.body;
  // items: [{ product_id, quantity, sku }]
  if (!address_id) return res.status(400).json({ error: '请选择收货地址' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: '请选择商品' });

  const address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?')
    .get(address_id, req.session.userId);
  if (!address) return res.status(400).json({ error: '收货地址无效' });

  const ids = items.map(i => i.product_id);
  const placeholders = ids.map(() => '?').join(',');
  const products = db.prepare(`SELECT id, title, price, cover, stock FROM products WHERE id IN (${placeholders})`)
    .all(...ids);
  const pMap = Object.fromEntries(products.map(p => [p.id, p]));

  const DISCOUNT_THRESHOLD = 200;
  const DISCOUNT_AMOUNT = 50;

  let total = 0;
  const snapshot = items.map(it => {
    const p = pMap[it.product_id];
    if (!p) throw new Error('商品不存在');
    total += p.price * it.quantity;
    return {
      product_id: p.id,
      title: p.title,
      price: p.price,
      cover: p.cover,
      quantity: it.quantity,
      sku: it.sku || null,
    };
  });

  const discount = total >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
  const finalTotal = total - discount;

  const orderNo = genOrderNo();
  const addrSnap = {
    name: address.name, phone: address.phone,
    province: address.province, city: address.city,
    district: address.district, detail: address.detail,
  };

  const tx = db.transaction(() => {
    const r = db.prepare(`INSERT INTO orders(order_no, user_id, address_snapshot, items_snapshot, total, status, remark)
      VALUES (?,?,?,?,?,?,?)`).run(orderNo, req.session.userId, JSON.stringify(addrSnap),
      JSON.stringify(snapshot), finalTotal, 'pending', remark || null);
    const orderId = r.lastInsertRowid;
    // 扣库存 + 增销量
    for (const it of items) {
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?), sales = sales + ? WHERE id = ?')
        .run(it.quantity, it.quantity, it.product_id);
    }
    // 从购物车清除
    if (from_cart) {
      for (const it of items) {
        db.prepare('DELETE FROM carts WHERE user_id = ? AND product_id = ?')
          .run(req.session.userId, it.product_id);
      }
    }
    return orderId;
  });
  const orderId = tx();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json(formatOrder(order));
});

// 订单列表
router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM orders WHERE user_id = ?';
  const params = [req.session.userId];
  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY id DESC';
  const rows = db.prepare(sql).all(...params).map(tryAutoShip);
  res.json(rows.map(formatOrder));
});

// 各状态订单数量
router.get('/counts', (req, res) => {
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS count FROM orders WHERE user_id = ? GROUP BY status
  `).all(req.session.userId);
  const map = Object.fromEntries(rows.map(r => [r.status, r.count]));
  res.json(map);
});

// 订单详情
router.get('/:id', (req, res) => {
  let o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  o = tryAutoShip(o);
  res.json(formatOrder(o));
});

// 付款（虚拟，直接转为 paid）
router.post('/:id/pay', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  if (o.status !== 'pending') return res.status(400).json({ error: '订单状态不可付款' });
  db.prepare("UPDATE orders SET status='paid', updated_at=datetime('now','localtime') WHERE id=?")
    .run(req.params.id);
  res.json({ ok: true });
});

// 模拟发货（立即变为 shipped，演示用）
router.post('/:id/ship', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  if (o.status !== 'paid') return res.status(400).json({ error: '订单状态不可发货' });
  db.prepare("UPDATE orders SET status='shipped', updated_at=datetime('now','localtime') WHERE id=?")
    .run(req.params.id);
  res.json({ ok: true });
});

// 确认收货
router.post('/:id/receive', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  if (o.status !== 'shipped') return res.status(400).json({ error: '订单状态不可收货' });
  db.prepare("UPDATE orders SET status='received', updated_at=datetime('now','localtime') WHERE id=?")
    .run(req.params.id);
  res.json({ ok: true });
});

// 取消订单
router.post('/:id/cancel', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  if (o.status !== 'pending') return res.status(400).json({ error: '仅待付款订单可取消' });
  db.prepare("UPDATE orders SET status='cancelled', updated_at=datetime('now','localtime') WHERE id=?")
    .run(req.params.id);
  res.json({ ok: true });
});

function formatOrder(o) {
  const r = {
    ...o,
    address: JSON.parse(o.address_snapshot),
    items: JSON.parse(o.items_snapshot),
    statusLabel: STATUS_LABEL[o.status] || o.status,
  };
  if (o.tracking) r.tracking = JSON.parse(o.tracking);
  return r;
}

export default router;
