import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeApi, productApi } from '../api/modules.js';
import Cover from '../components/Cover.jsx';

const TABS = ['推荐', '直播', '超值补贴', '聚惠团', '外卖', '新品', '便宜好货', '潮流'];
const QUICK = [
  { ic: '🏭', label: '工厂直供', badge: '' },
  { ic: '🧧', label: '红包', badge: '更省' },
  { ic: '🌱', label: '阳光农场', badge: '' },
  { ic: '🪙', label: '多巴胺币', badge: '' },
  { ic: '🎫', label: '领券中心', badge: '' },
  { ic: '📦', label: '会员中心', badge: '' },
  { ic: '🎯', label: '每日特价', badge: '' },
  { ic: '🍜', label: '外卖', badge: '热' },
];

export default function Home() {
  const [data, setData] = useState(null);
  const [feed, setFeed] = useState([]);
  const [tab, setTab] = useState('推荐');
  const [kw, setKw] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    homeApi.get().then(setData).catch(() => {});
    productApi.list({ pageSize: 20, sort: 'sales' }).then(r => setFeed(r.list)).catch(() => {});
  }, []);

  const doSearch = () => navigate(kw ? `/search/result?keyword=${encodeURIComponent(kw)}` : '/search');

  if (!data) return <div className="loading">加载中...</div>;

  const handleTab = (t) => {
    setTab(t);
    if (t === '外卖') navigate('/delivery/all');
  };

  return (
    <div className="page">
      <div className="home-search">
        <div className="tabs no-scrollbar">
          {TABS.map((t) => (
            <span key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => handleTab(t)}>{t}</span>
          ))}
        </div>
        <div className="search-box">
          <span style={{ color: 'var(--text-secondary)' }}>⌃</span>
          <input value={kw} onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="高质量短袖t恤" />
          <span className="cam">📷</span>
          <span className="go" onClick={doSearch}
            style={{ background: '#1677ff', color: '#fff', padding: '4px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>搜索</span>
        </div>
      </div>

      <div className="quick-icons no-scrollbar">
        {QUICK.map((q) => (
          <div key={q.label} className="qi" onClick={q.label === '领券中心' ? () => navigate('/coupons') : q.label === '外卖' ? () => navigate('/delivery/all') : q.label === '阳光农场' ? () => navigate('/farm') : undefined}>
            <div className="ic" style={{ background: 'var(--primary-light)' }}>
              {q.ic}
              {q.badge && <span className="badge">{q.badge}</span>}
            </div>
            {q.label}
          </div>
        ))}
      </div>

      {/* 外卖 nearby shops */}
      <div className="delivery-section">
        <div className="ds-head" onClick={() => navigate('/delivery/all')}>
          <span><span className="ds-head-icon">🍜</span> 附近外卖</span>
          <span className="ds-head-more">更多 ›</span>
        </div>
        <div className="ds-shops no-scrollbar">
          {data.delivery?.map((s) => (
            <div className="ds-shop" key={s.id} onClick={() => navigate(`/delivery/shop/${s.id}`)}>
              <div className="ds-shop-cover">{s.cover}</div>
              <div className="ds-shop-name">{s.name}</div>
              <div className="ds-shop-rating">★ {s.rating} 月售{s.sales > 999 ? (s.sales / 1000).toFixed(1) + 'k' : s.sales}</div>
              <div className="ds-shop-fee">配送¥{s.delivery_fee} · {s.delivery_time}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="red-banner" style={{ cursor: 'pointer' }} onClick={() => navigate('/coupons')}>
        <span>🎁 超级立减 · 满200减50</span>
        <span className="rb-coupon">¥10 立即领取</span>
      </div>

      <div className="card" style={{ padding: '10px 4px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
          {data.categories.map((c) => (
            <Link key={c.id} to={`/category?cat=${c.id}`} style={{ textAlign: 'center', padding: '6px 0' }}>
              <div style={{ fontSize: 22 }}>{c.icon}</div>
              <div style={{ fontSize: 10, marginTop: 2, color: 'var(--text-secondary)' }}>{c.name}</div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 15 }}>猜你喜欢</div>
      <div className="masonry">
        {feed.map((p) => (
          <Link to={`/product/${p.id}`} className="m-item" key={p.id}>
            <div className="cover">
              <Cover src={p.cover} seed={`p${p.id}`} />
            </div>
            <div className="info">
              <div className="title">
                <span className="brand-tag">精选</span>{p.title}
              </div>
              <div className="meta">{p.sales > 999 ? (p.sales / 1000).toFixed(1) + 'k+回头客' : p.sales + '人付款'} · {p.tags?.[0] || '热销'}</div>
              <div className="price-row">
                <span style={{ color: 'var(--primary)', fontSize: 12 }}>¥</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 17 }}>{p.price}</span>
                <span className="star">★ {(p.rating || 5).toFixed(1)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
