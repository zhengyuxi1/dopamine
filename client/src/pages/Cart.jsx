import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartApi } from '../api/modules.js';
import { useUser } from '../store/user.jsx';
import { useCart } from '../store/cart.jsx';
import { useToast } from '../store/toast.jsx';
import Cover from '../components/Cover.jsx';
import Empty from '../components/Empty.jsx';

const FILTERS = [
  { ic: '⬇', label: '超级立减' },
  { ic: '⬇', label: '降价' },
  { ic: '📁', label: '分组' },
  { ic: '😊', label: '常购' },
];

export default function Cart() {
  const { user } = useUser();
  const { refresh: refreshCount } = useCart();
  const { show } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manage, setManage] = useState(false);

  const load = () => {
    setLoading(true);
    cartApi.list().then(r => setItems(r)).finally(() => setLoading(false));
  };
  useEffect(() => { if (user) load(); else { setItems([]); setLoading(false); } }, [user]);

  const update = async (id, data) => { await cartApi.update(id, data); load(); refreshCount(); };
  const remove = async (id) => { await cartApi.remove(id); show('已删除'); load(); refreshCount(); };

  const allSel = items.length > 0 && items.every(i => i.selected);
  const toggleAll = async (sel) => { await cartApi.selectAll(sel); load(); };

  const selected = items.filter(i => i.selected);
  const total = selected.reduce((s, i) => s + i.price * i.quantity, 0);

  const checkout = () => {
    if (selected.length === 0) return show('请选择商品');
    const payload = selected.map(i => ({ product_id: i.id, quantity: i.quantity, title: i.title, price: i.price, cover: i.cover }));
    sessionStorage.setItem('checkout_items', JSON.stringify(payload));
    sessionStorage.setItem('checkout_from_cart', '1');
    navigate('/checkout');
  };

  // 按店铺（category）分组
  const groups = {};
  for (const it of items) {
    const shop = it.category_name || '多巴胺甄选';
    if (!groups[shop]) groups[shop] = [];
    groups[shop].push(it);
  }
  const shopNames = Object.keys(groups);
  const shopSelAll = (shop) => {
    const g = groups[shop];
    const allSelected = g.every(i => i.selected);
    Promise.all(g.map(i => cartApi.update(i.cart_id, { selected: !allSelected }))).then(() => { load(); });
  };

  if (!user) return (
    <div className="page">
      <CartHeader count={0} manage={manage} setManage={setManage} />
      <Empty emoji="🛒" text="请先登录" action={<button className="btn primary" onClick={() => navigate('/login')}>去登录</button>} />
    </div>
  );

  if (!loading && items.length === 0) return (
    <div className="page">
      <CartHeader count={0} manage={manage} setManage={setManage} />
      <Empty emoji="🛒" text="购物车空空如也" action={<Link className="btn primary" to="/">去逛逛</Link>} />
    </div>
  );

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      <CartHeader count={items.length} manage={manage} setManage={setManage} />

      {/* 筛选条 */}
      <div className="cart-filter no-scrollbar">
        {FILTERS.map(f => (
          <span key={f.label} className="cf"><span style={{ color: 'var(--primary)' }}>{f.ic}</span>{f.label}</span>
        ))}
        <span className="cf" style={{ marginLeft: 'auto' }}>⏷ 筛选</span>
      </div>

      {/* 店铺分组 */}
      {shopNames.map(shop => {
        const g = groups[shop];
        const gAll = g.every(i => i.selected);
        return (
          <div className="shop-card" key={shop}>
            <div className="shop-head">
              <input type="checkbox" className="ck-round" checked={gAll} onChange={() => shopSelAll(shop)} />
              <span className="brand-flag">精选</span>
              <span className="shop-name">{shop}官方旗舰店</span>
              <span style={{ color: 'var(--text-light)' }}>›</span>
            </div>
            {g.map(it => (
              <div className="cart-row" key={it.cart_id}>
                <input type="checkbox" className="ck-round ck"
                  checked={!!it.selected}
                  onChange={(e) => update(it.cart_id, { selected: e.target.checked })} />
                <Link to={`/product/${it.id}`} className="ci">
                  <Cover src={it.cover} seed={`p${it.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Link>
                <div className="cb">
                  <div className="title">{it.title}</div>
                  <div className="sku">{it.subtitle || '默认款式'}</div>
                  <div className="svc">
                    <span>假一赔四</span>
                    <span>7天无理由</span>
                  </div>
                  <div className="bottom">
                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 16 }}>¥{it.price}</span>
                    <div className="stepper">
                      <button onClick={() => update(it.cart_id, { quantity: it.quantity - 1 })}>−</button>
                      <span className="num">{it.quantity}</span>
                      <button onClick={() => update(it.cart_id, { quantity: it.quantity + 1 })}>+</button>
                    </div>
                  </div>
                </div>
                {manage && <span style={{ color: 'var(--text-light)', fontSize: 12, alignSelf: 'flex-start' }} onClick={() => remove(it.cart_id)}>删除</span>}
              </div>
            ))}
          </div>
        );
      })}

      {/* 底部结算栏 */}
      <div style={{
        position: 'fixed', bottom: 50, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid var(--border)',
        padding: '10px 14px calc(10px + var(--safe-bottom))', display: 'flex', alignItems: 'center', gap: 10, zIndex: 100,
      }}>
        <input type="checkbox" className="ck-round" checked={allSel} onChange={(e) => toggleAll(e.target.checked)} />
        <span style={{ fontSize: 13 }}>全选</span>
        {!manage ? (
          <>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>合计 </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 18 }}>¥{total.toFixed(2)}</span>
            </div>
            <button className="btn primary" disabled={selected.length === 0} onClick={checkout}
              style={{ padding: '10px 24px', borderRadius: 999 }}>结算({selected.length})</button>
          </>
        ) : (
          <>
            <div style={{ flex: 1 }} />
            <button className="btn" style={{ borderColor: 'var(--text-light)', color: 'var(--text-secondary)' }}
              onClick={() => { Promise.all(selected.map(s => cartApi.remove(s.cart_id))).then(() => { load(); refreshCount(); show('已删除'); }); }}>
              删除选中
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CartHeader({ count, manage, setManage }) {
  const navigate = useNavigate();
  return (
    <div className="navbar" style={{ background: '#fff', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontWeight: 700, fontSize: 17 }}>购物车 ({count})</span>
      <span className="right" style={{ display: 'flex', gap: 14, color: 'var(--text-secondary)', fontSize: 13 }}>
        <span onClick={() => navigate('/search')}>🔍</span>
        <span onClick={() => setManage(!manage)} style={{ color: manage ? 'var(--primary)' : 'var(--text-secondary)' }}>{manage ? '完成' : '管理'}</span>
      </span>
    </div>
  );
}
