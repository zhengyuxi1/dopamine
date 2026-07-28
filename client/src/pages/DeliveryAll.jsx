import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryApi } from '../api/modules.js';

export default function DeliveryAll() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);

  useEffect(() => {
    deliveryApi.shops().then(setShops).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="navbar white">
        <span className="back" onClick={() => navigate(-1)}>‹</span>
        <span className="title">附近外卖</span>
        <span className="right" />
      </div>

      <div className="da-list">
        {shops.map((s) => (
          <div className="da-shop" key={s.id} onClick={() => navigate(`/delivery/shop/${s.id}`)}>
            <div className="da-cover">{s.cover}</div>
            <div className="da-info">
              <div className="da-name">{s.name}</div>
              <div className="da-rating">
                ★ {s.rating}
                <span className="da-sales">月售{s.sales > 999 ? (s.sales / 1000).toFixed(1) + 'k' : s.sales}</span>
                <span className="da-distance">{s.distance}</span>
              </div>
              <div className="da-tags">
                {s.tags?.map((t, i) => <span key={i} className="tag gray">{t}</span>)}
              </div>
              <div className="da-delivery">
                配送费¥{s.delivery_fee} · 满¥{s.min_order}起送 · 约{s.delivery_time}
              </div>
              <div className="da-menu-count">{s.menu_count}款商品</div>
            </div>
          </div>
        ))}
        {!shops.length && <div className="empty"><div className="emoji">🍜</div><div className="text">附近暂无外卖店铺</div></div>}
      </div>
    </div>
  );
}
