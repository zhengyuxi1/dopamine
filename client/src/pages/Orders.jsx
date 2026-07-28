import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderApi } from '../api/modules.js';
import { useUser } from '../store/user.jsx';
import Empty from '../components/Empty.jsx';
import Navbar from '../components/Navbar.jsx';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'received', label: '已完成' },
];

export default function Orders() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = params.get('status') || 'all';
  const [tab, setTab] = useState(TABS.some(t => t.key === initial) ? initial : 'all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    orderApi.list(tab).then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, [tab, user]);

  if (!user) return null;

  return (
    <div className="page">
      <Navbar title="我的订单" />

      {/* tab */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 44, zIndex: 10 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '12px 0', fontSize: 13,
            color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: tab === t.key ? 600 : 400,
            borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? <div className="loading">加载中...</div> :
        orders.length === 0 ? <Empty emoji="📋" text="暂无订单" action={<Link className="btn primary" to="/">去购物</Link>} /> :
        orders.map((o) => (
          <div key={o.id} className="card" style={{ padding: 12 }} onClick={() => navigate(`/orders/${o.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-light)', fontSize: 12 }}>订单号 {o.order_no}</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>{o.statusLabel}</span>
            </div>
            {o.items.slice(0, 3).map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 6, overflow: 'hidden', background: '#f7f7f7', flexShrink: 0 }}>
                  <img src={it.cover && (it.cover.startsWith('http') || it.cover.startsWith('/images')) ? it.cover : `https://picsum.photos/seed/p${it.product_id}/100/100`}
                    alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</div>
                <div style={{ color: 'var(--text-light)' }}>×{it.quantity}</div>
              </div>
            ))}
            {o.items.length > 3 && <div style={{ color: 'var(--text-light)', fontSize: 12 }}>等{o.items.length}件商品</div>}
            <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13 }}>
              共{o.items.reduce((s,i)=>s+i.quantity,0)}件 合计 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>¥{o.total.toFixed(2)}</span>
            </div>
          </div>
        ))
      }
    </div>
  );
}
