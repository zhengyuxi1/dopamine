import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addressApi, orderApi } from '../api/modules.js';
import { useUser } from '../store/user.jsx';
import { useCart } from '../store/cart.jsx';
import { useToast } from '../store/toast.jsx';
import Navbar from '../components/Navbar.jsx';
import Cover from '../components/Cover.jsx';
import Price from '../components/Price.jsx';
import Empty from '../components/Empty.jsx';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { refresh: refreshCount } = useCart();
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [address, setAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const raw = sessionStorage.getItem('checkout_items');
    if (!raw) { navigate('/cart'); return; }
    setItems(JSON.parse(raw));
    addressApi.list().then(r => {
      setAddresses(r);
      const def = r.find(a => a.is_default) || r[0];
      setAddress(def || null);
    });
  }, [user]);

  const DISCOUNT_THRESHOLD = 200;
  const DISCOUNT_AMOUNT = 50;
  const rawTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = rawTotal >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
  const total = rawTotal - discount;

  const submit = async () => {
    if (!address) return show('请添加收货地址');
    setSubmitting(true);
    try {
      const fromCart = sessionStorage.getItem('checkout_from_cart') === '1';
      const order = await orderApi.create({
        address_id: address.id,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        remark, from_cart: fromCart,
      });
      sessionStorage.removeItem('checkout_items');
      sessionStorage.removeItem('checkout_from_cart');
      refreshCount();
      show('下单成功');
      navigate(`/orders/${order.id}`);
    } catch (err) {
      show(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!items.length) return null;

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <Navbar title="确认订单" />

      {/* 收货地址 */}
      <div className="card" style={{ padding: 14 }} onClick={() => navigate('/addresses?from=checkout')}>
        {address ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{address.name}</span>
              <span>{address.phone}</span>
              {address.is_default ? <span className="tag">默认</span> : null}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 13 }}>
              {address.province}{address.city}{address.district}{address.detail}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--primary)', padding: 8 }}>+ 添加收货地址</div>
        )}
        <div style={{ textAlign: 'right', color: 'var(--text-light)', marginTop: 4 }}>›</div>
      </div>

      {/* 商品列表 */}
      <div className="card" style={{ padding: 12 }}>
        {items.map((it) => (
          <div key={it.product_id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 70, height: 70, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#f7f7f7' }}>
              <Cover src={it.cover} seed={`p${it.product_id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Price value={it.price} />
                <span style={{ color: 'var(--text-light)' }}>×{it.quantity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 备注 */}
      <div className="card" style={{ padding: 14 }}>
        <div className="field" style={{ padding: 0, borderBottom: 'none' }}>
          <label>订单备注</label>
          <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="选填，留言给商家" />
        </div>
      </div>

      {/* 虚拟支付说明 */}
      <div className="card" style={{ padding: '12px 14px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 13 }}>
        ⓘ 本订单为虚拟购物体验，提交后无需真实付款，可直接模拟发货与收货流程。
      </div>

      {/* 底部提交 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid var(--border)',
        padding: '12px 14px calc(12px + var(--safe-bottom))', display: 'flex', alignItems: 'center', zIndex: 200,
      }}>
        <div style={{ flex: 1, textAlign: 'right', paddingRight: 12 }}>
          {discount > 0 && (
            <div style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 2 }}>
              满减 -¥{DISCOUNT_AMOUNT}
            </div>
          )}
          <span style={{ fontSize: 13 }}>合计 </span><Price value={total} size="large" />
        </div>
        <button className="btn primary" disabled={submitting} onClick={submit}
          style={{ padding: '12px 28px' }}>{submitting ? '提交中...' : '提交订单'}</button>
      </div>
    </div>
  );
}
