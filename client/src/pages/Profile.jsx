import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../store/user.jsx';
import { productApi, couponApi, orderApi } from '../api/modules.js';
import Cover from '../components/Cover.jsx';

const ORDER_STATUS = [
  { ic: '💳', label: '待付款', status: 'pending' },
  { ic: '📦', label: '待发货', status: 'paid' },
  { ic: '🚚', label: '待收货', status: 'shipped' },
  { ic: '✍️', label: '待评价', status: 'received' },
  { ic: '↩️', label: '退款售后', status: 'after' },
];

const ASSETS = [
  { v: '¥0.00', label: '红包' },
  { v: null, key: 'coupon', label: '优惠券', to: '/coupons' },
  { v: '888', label: '多巴胺币' },
  { v: '¥0', label: '省钱卡' },
  { v: '¥5000', label: '信用付' },
];

const UTILS = [
  { ic: '🚚', label: '我的物流', sub: '查看包裹动态', to: '/orders' },
  { ic: '❤️', label: '我的收藏', sub: '心动的好物', to: '/favorites' },
  { ic: '🏪', label: '我的店铺', sub: '最近购买', to: '/orders' },
  { ic: '👣', label: '我的足迹', sub: '最近浏览', to: '/orders' },
];

const FEATURES = [
  { ic: '🌱', label: '阳光农场', c: '#52c41a' },
  { ic: '🪙', label: '签到领币', c: '#faad14' },
  { ic: '🧧', label: '每日红包', c: '#ff2442' },
  { ic: '🎰', label: '抽奖', c: '#722ed1' },
  { ic: '🎁', label: '领券中心', c: '#ff5000', to: '/coupons' },
  { ic: '👑', label: '会员中心', c: '#faad14' },
  { ic: '🎯', label: '每日特价', c: '#ff5000' },
  { ic: '📦', label: '二手集市', c: '#1677ff' },
];

export default function Profile() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [tab, setTab] = useState('guess');
  const [couponCount, setCouponCount] = useState(0);
  const [orderCounts, setOrderCounts] = useState({});

  useEffect(() => {
    productApi.list({ pageSize: 12, sort: 'sales' }).then(r => setFeed(r.list)).catch(() => {});
    if (user) {
      couponApi.count().then(r => setCouponCount(r.count)).catch(() => {});
      orderApi.counts().then(setOrderCounts).catch(() => {});
    }
  }, [user]);

  const go = (to) => navigate(user ? to : '/login');

  return (
    <div className="page" style={{ background: '#f4f4f4', paddingBottom: 12 }}>
      {/* 顶部用户区 */}
      <div style={{
        background: 'linear-gradient(180deg, #ff5000 0%, #ff7a45 100%)',
        color: '#fff', padding: 'calc(16px + var(--safe-top)) 16px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600,
              }}>{user.nickname?.charAt(0) || 'U'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{user.nickname}</span>
                  <span style={{ fontSize: 10, background: 'linear-gradient(90deg,#ffd700,#ffae00)', color: '#7a3d00', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>黄金会员</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>账号：{user.username}</div>
              </div>
            </>
          ) : (
            <div onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>点击登录 / 注册</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>登录后享受更多购物乐趣</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, fontSize: 18 }} onClick={() => go('/settings')}>
            <span onClick={() => go('/addresses')}>📍</span>
            <span>🎧</span>
            <span>⚙️</span>
          </div>
        </div>

        {/* 会员条 */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, fontSize: 12 }}>
          <div>累计节省 <b style={{ fontSize: 15 }}>¥1280</b></div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <span style={{ background: 'rgba(255,255,255,0.25)', padding: '3px 10px', borderRadius: 999 }}>会员中心</span>
            <span style={{ background: 'linear-gradient(90deg,#1a1a1a,#444)', padding: '3px 10px', borderRadius: 999 }}>黑卡会员</span>
          </div>
        </div>
      </div>

      {/* 资产卡 */}
      <div className="asset-card" style={{ marginTop: -6, borderRadius: '12px 12px 0 0', paddingTop: 12 }}>
        <div className="asset-row">
          {ASSETS.map((a) => (
            <div className="ac" key={a.label} onClick={a.to ? () => go(a.to) : undefined}>
              <div className="v">{a.key === 'coupon' ? couponCount : a.v}</div>
              <div style={{ marginTop: 2 }}>{a.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 我的订单 */}
      <div className="card" style={{ padding: '14px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 4px' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>我的订单</span>
          <span style={{ color: 'var(--text-light)', fontSize: 12 }} onClick={() => go('/orders')}>查看全部 ›</span>
        </div>
        <div className="order-status-row">
          {ORDER_STATUS.map((e) => (
            <div className="os" key={e.label} onClick={() => e.status === 'after' ? go('/orders') : go(`/orders?status=${e.status}`)}>
              <div className="ic">{e.ic}</div>
              <div style={{ marginTop: 4 }}>{e.label}</div>
              {orderCounts[e.status] > 0 && <span className="badge">{orderCounts[e.status]}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 工具宫格 */}
      <div className="service-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {UTILS.map((u) => (
          <Link to={u.to} key={u.label} className="sg" style={{ padding: '4px 0' }}>
            <div className="ic">{u.ic}</div>
            <div style={{ fontWeight: 500, color: 'var(--text)' }}>{u.label}</div>
            <div style={{ fontSize: 10, marginTop: 2 }}>{u.sub}</div>
          </Link>
        ))}
      </div>

      {/* 红包条 */}
      <div className="red-banner" style={{ margin: '0 12px 12px' }} onClick={() => go('/coupons')}>
        <span>🎁 优惠券中心 · 天天领红包</span>
        <span className="rb-coupon">去领取</span>
      </div>

      {/* 功能横滚 */}
      <div className="quick-icons no-scrollbar" style={{ padding: '8px 8px 12px' }}>
        {FEATURES.map((f) => (
          <div className="qi" key={f.label} onClick={f.to ? () => go(f.to) : undefined}>
            <div className="ic" style={{ background: `${f.c}22`, color: f.c }}>{f.ic}</div>
            {f.label}
          </div>
        ))}
      </div>

      {/* 猜你喜欢 tabs */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[
            { k: 'guess', label: '猜你喜欢' },
            { k: 'fav', label: '我的收藏' },
            { k: 'review', label: '我的评价' },
          ].map((t) => (
            <div key={t.k} onClick={() => { setTab(t.k); if (t.k === 'fav') go('/favorites'); }}
              style={{
                flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 14,
                color: tab === t.k ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: tab === t.k ? 600 : 400,
                borderBottom: tab === t.k ? '2px solid var(--primary)' : '2px solid transparent',
              }}>{t.label}</div>
          ))}
        </div>
        <div className="masonry" style={{ padding: 8 }}>
          {feed.map((p) => (
            <Link to={`/product/${p.id}`} className="m-item" key={p.id}>
              <div className="cover"><Cover src={p.cover} seed={`p${p.id}`} /></div>
              <div className="info">
                <div className="title"><span className="brand-tag">精选</span>{p.title}</div>
                <div className="meta">{p.sales > 999 ? (p.sales / 1000).toFixed(1) + 'k+回头客' : p.sales + '人付款'}</div>
                <div className="price-row">
                  <span style={{ color: 'var(--primary)', fontSize: 12 }}>¥</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 16 }}>{p.price}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {user && (
        <div style={{ padding: '20px 12px 8px' }}>
          <button className="btn block" onClick={async () => { await logout(); navigate('/'); }}>退出登录</button>
        </div>
      )}
      <div style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 12, padding: '8px 0 16px' }}>
        多巴胺商店 · 虚拟购物体验 · v1.0
      </div>
    </div>
  );
}
