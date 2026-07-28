import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deliveryApi, cartApi } from '../api/modules.js';
import { useToast } from '../store/toast.jsx';
import Cover from '../components/Cover.jsx';

export default function DeliveryShop() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [shop, setShop] = useState(null);

  useEffect(() => {
    deliveryApi.shopDetail(id).then(setShop).catch(() => {});
  }, [id]);

  const addToCart = (item) => {
    cartApi.add({ product_id: item.id, quantity: 1 }).then(() => {
      toast.show(`已加入购物车`);
    }).catch((e) => toast.show(e.message));
  };

  const buyNow = (item) => {
    cartApi.add({ product_id: item.id, quantity: 1 }).then(() => {
      navigate('/cart');
    }).catch((e) => toast.show(e.message));
  };

  if (!shop) return <div className="loading">加载中...</div>;

  return (
    <div className="page">
      <div className="navbar white">
        <span className="back" onClick={() => navigate(-1)}>‹</span>
        <span className="title">{shop.name}</span>
        <span className="right" />
      </div>

      {/* 店铺头部 */}
      <div className="ds-header">
        <div className="ds-cover">{shop.cover}</div>
        <div className="ds-info">
          <div className="ds-name">{shop.name}</div>
          <div className="ds-meta">
            <span>★ {shop.rating}</span>
            <span>月售{shop.sales > 999 ? (shop.sales / 1000).toFixed(1) + 'k' : shop.sales}</span>
            <span>距您{shop.distance}</span>
          </div>
          <div className="ds-tags">
            {shop.tags?.map((t, i) => <span key={i} className="tag gray">{t}</span>)}
          </div>
          <div className="ds-delivery">
            配送费¥{shop.delivery_fee} · 满¥{shop.min_order}起送 · 约{shop.delivery_time}
          </div>
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="ds-menu">
        <div className="ds-menu-title">全部商品</div>
        {shop.menu?.map((item) => (
          <div className="ds-item" key={item.id}>
            <div className="ds-item-cover">
              <Cover src={item.cover} seed={`p${item.id}`} />
            </div>
            <div className="ds-item-info">
              <div className="ds-item-title">{item.title}</div>
              <div className="ds-item-sub">{item.subtitle}</div>
              <div className="ds-item-tags">
                {item.tags?.map((t, i) => <span key={i} className="tag">{t}</span>)}
              </div>
              <div className="ds-item-meta">月售{item.sales > 999 ? (item.sales / 1000).toFixed(1) + 'k' : item.sales}</div>
              <div className="ds-item-bottom">
                <div className="ds-item-price">
                  <span className="ds-symbol">¥</span>{item.price}
                  {item.original_price > item.price && (
                    <span className="ds-original">¥{item.original_price}</span>
                  )}
                </div>
                <div className="ds-item-actions">
                  <button className="ds-btn" onClick={() => addToCart(item)}>加入购物车</button>
                  <button className="ds-btn primary" onClick={() => buyNow(item)}>立即购买</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
