import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderApi } from '../api/modules.js';
import { useToast } from '../store/toast.jsx';
import Navbar from '../components/Navbar.jsx';
import Empty from '../components/Empty.jsx';
import { useCart } from '../store/cart.jsx';

const STATUS_FLOW = {
  pending: ['pay', '取消订单'],
  paid: [],
  shipped: ['确认收货'],
  received: [],
  cancelled: [],
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const { refresh: refreshCount } = useCart();
  const [order, setOrder] = useState(null);

  const load = () => orderApi.detail(id).then(setOrder).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const action = async (type) => {
    try {
      if (type === 'pay') { await orderApi.pay(id); show('支付成功'); }
      else if (type === 'ship') { await orderApi.ship(id); show('已模拟发货'); }
      else if (type === 'cancel') { await orderApi.cancel(id); show('订单已取消'); }
      else if (type === 'receive') { await orderApi.receive(id); show('已确认收货'); }
      load();
    } catch (err) { show(err.message); }
  };

  if (!order) return <><Navbar title="订单详情" /><div className="loading">加载中...</div></>;

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <Navbar title="订单详情" />

      {/* 状态条 */}
      <div style={{ background: 'var(--primary)', color: '#fff', padding: '20px 14px' }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{order.statusLabel}</div>
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
          {order.status === 'pending' && '请尽快完成付款（虚拟支付，点击即可完成）'}
          {order.status === 'paid' && '商家正在备货中，15秒后自动发货'}
          {order.status === 'shipped' && '商品已发出，收到后请确认收货'}
          {order.status === 'received' && '订单已完成，感谢惠顾'}
          {order.status === 'cancelled' && '订单已取消'}
        </div>
      </div>

      {/* 收货地址 */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
          📍 <span style={{ fontWeight: 600 }}>{order.address.name}</span> <span>{order.address.phone}</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 13, paddingLeft: 26 }}>
          {order.address.province}{order.address.city}{order.address.district}{order.address.detail}
        </div>
      </div>

      {/* 商品 */}
      <div className="card" style={{ padding: 12 }}>
        {order.items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 70, height: 70, borderRadius: 6, overflow: 'hidden', background: '#f7f7f7', flexShrink: 0 }}>
                  <img src={it.cover && (it.cover.startsWith('http') || it.cover.startsWith('/images')) ? it.cover : `https://picsum.photos/seed/p${it.product_id}/100/100`}
                    alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, lineHeight: 1.4 }}>{it.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ color: 'var(--primary)' }}>¥{it.price.toFixed(2)}</span>
                <span style={{ color: 'var(--text-light)' }}>×{it.quantity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 订单信息 */}
      <div className="card" style={{ padding: 14, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ color: 'var(--text-secondary)' }}>订单编号</span><span>{order.order_no}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ color: 'var(--text-secondary)' }}>下单时间</span><span>{order.created_at}</span>
        </div>
        {order.remark && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>备注</span><span>{order.remark}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <span>实付款</span>
          <span style={{ color: 'var(--primary)', fontSize: 16, fontWeight: 600 }}>¥{order.total.toFixed(2)}</span>
        </div>
      </div>

      {/* 物流追踪 */}
      {order.tracking && (
        <div className="card" style={{ padding: 14, fontSize: 13 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>🚚 物流追踪</div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            {order.tracking.courier}　{order.tracking.tracking_no}
          </div>
          {order.tracking.events.map((ev, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderLeft: i < order.tracking.events.length - 1 ? '2px solid var(--primary)' : '2px solid transparent', marginLeft: 4, paddingLeft: 12 }}>
              <div style={{ flex: 1 }}>{ev.desc}</div>
              <div style={{ color: 'var(--text-light)', fontSize: 12, whiteSpace: 'nowrap' }}>{ev.time}</div>
            </div>
          ))}
        </div>
      )}

      {/* 底部操作 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid var(--border)',
        padding: '10px 14px calc(10px + var(--safe-bottom))', display: 'flex', gap: 10, justifyContent: 'flex-end', zIndex: 200,
      }}>
        {STATUS_FLOW[order.status].map((label, i) => (
          <button key={i}
            className={i === 0 && order.status !== 'cancel' ? 'btn primary' : 'btn'}
            onClick={() => action(label === '模拟发货' ? 'ship' : label === '取消订单' ? 'cancel' : label === '确认收货' ? 'receive' : 'pay')}
          >{label}</button>
        ))}
      </div>
    </div>
  );
}
