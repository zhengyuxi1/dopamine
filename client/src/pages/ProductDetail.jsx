import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productApi, cartApi, favoriteApi } from '../api/modules.js';
import { useUser } from '../store/user.jsx';
import { useCart } from '../store/cart.jsx';
import { useToast } from '../store/toast.jsx';
import Navbar from '../components/Navbar.jsx';
import Cover from '../components/Cover.jsx';
import Price from '../components/Price.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { refresh: refreshCart } = useCart();
  const { show } = useToast();
  const [data, setData] = useState(null);
  const [fav, setFav] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [showBuy, setShowBuy] = useState(false);
  const [buyAnim, setBuyAnim] = useState('');
  const [qty, setQty] = useState(1);
  const [buyMode, setBuyMode] = useState('cart'); // cart | buy

  const openBuy = (mode) => {
    setBuyMode(mode);
    setQty(1);
    setShowBuy(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setBuyAnim('enter')));
  };

  const closeBuy = () => {
    setBuyAnim('leave');
    setTimeout(() => {
      setShowBuy(false);
      setBuyAnim('');
    }, 200);
  };

  useEffect(() => {
    productApi.detail(id).then(setData).catch(() => {});
    if (user) favoriteApi.status(id).then(r => setFav(r.favorited)).catch(() => {});
  }, [id, user]);

  if (!data) return <><Navbar title="商品详情" /><div className="loading">加载中...</div></>;

  const images = data.images?.length ? data.images : [data.cover];

  const addToCart = async () => {
    if (!user) { show('请先登录'); navigate('/login'); return; }
    await cartApi.add({ product_id: Number(id), quantity: qty });
    refreshCart();
    show('已加入购物车');
  };

  const buyNow = async () => {
    if (!user) { show('请先登录'); navigate('/login'); return; }
    const item = { product_id: Number(id), quantity: qty, title: data.title, price: data.price, cover: data.cover };
    sessionStorage.setItem('checkout_items', JSON.stringify([item]));
    sessionStorage.removeItem('checkout_from_cart');
    navigate('/checkout');
  };

  const toggleFav = async () => {
    if (!user) { show('请先登录'); navigate('/login'); return; }
    const r = await favoriteApi.toggle(id);
    setFav(r.favorited);
    show(r.favorited ? '已收藏' : '已取消收藏');
  };

  return (
    <div className="page" style={{ paddingBottom: 60 }}>
      <Navbar title={data.title} right={
        <span onClick={toggleFav} style={{ fontSize: 20 }}>{fav ? '❤️' : '🤍'}</span>
      } />

      {/* 主图 */}
      <div style={{ background: '#fff', position: 'relative' }}>
        <div style={{ width: '100%', aspectRatio: 1, background: '#f7f7f7' }}>
          <Cover src={images[imgIdx]} seed={`p${id}_${imgIdx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.4)', color: '#fff',
          padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
          {imgIdx + 1}/{images.length}
        </div>
      </div>

      {/* 缩略图 */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, padding: 12, background: '#fff', overflowX: 'auto' }}>
          {images.map((img, i) => (
            <div key={i} onClick={() => setImgIdx(i)} style={{
              width: 50, height: 50, borderRadius: 6, overflow: 'hidden',
              border: i === imgIdx ? '2px solid var(--primary)' : '2px solid transparent',
            }}>
              <Cover src={img} seed={`p${id}_t${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}

      {/* 价格区 */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <Price value={data.price} original={data.original_price} size="large" />
          {data.is_flash && <span className="tag">⚡限时秒杀</span>}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8, lineHeight: 1.4 }}>{data.title}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{data.subtitle}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: 'var(--text-light)', fontSize: 12 }}>
          <span>销量 {data.sales} · 评价 {data.reviewCount}</span>
          <span>评分 {data.reviewAvg} ⭐</span>
        </div>
      </div>

      {/* 标签 */}
      {data.tags?.length > 0 && (
        <div className="card" style={{ padding: '12px 14px', display: 'flex', gap: 6 }}>
          {data.tags.map((t, i) => <span key={i} className={`tag ${i ? 'gold' : ''}`}>{t}</span>)}
        </div>
      )}

      {/* 详情 */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>商品详情</div>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>{data.description}</div>
      </div>

      {/* 评价 */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>用户评价 ({data.reviewCount})</div>
        {data.reviews.length === 0 ? (
          <div style={{ color: 'var(--text-light)', textAlign: 'center', padding: 16 }}>暂无评价</div>
        ) : (
          data.reviews.map((r) => (
            <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-light)',
                  color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                  {r.user_name.charAt(0)}
                </div>
                <span style={{ fontWeight: 500 }}>{r.user_name}</span>
                <span style={{ color: 'var(--gold)', marginLeft: 'auto' }}>{'★'.repeat(r.rating)}</span>
              </div>
              <div style={{ color: 'var(--text)', marginTop: 6, fontSize: 13 }}>{r.content}</div>
            </div>
          ))
        )}
      </div>

      {/* 底部操作栏 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid var(--border)',
        padding: '8px 12px calc(8px + var(--safe-bottom))', display: 'flex', gap: 10, alignItems: 'center', zIndex: 200,
      }}>
        <button onClick={() => navigate('/cart')} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 20 }}>🛒</div>购物车
        </button>
        <button onClick={() => navigate('/favorites')} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 20 }}>❤️</div>收藏
        </button>
        <button className="btn" style={{ flex: 1, background: 'var(--secondary)', color: '#fff', borderColor: 'var(--secondary)' }}
          onClick={() => openBuy('cart')}>加入购物车</button>
        <button className="btn primary" style={{ flex: 1 }}
          onClick={() => openBuy('buy')}>立即购买</button>
      </div>

      {/* 购买弹窗 */}
      {showBuy && (
        <>
          <div onClick={closeBuy} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300,
            maxWidth: 480, margin: '0 auto',
            transition: 'opacity 0.2s ease',
            opacity: buyAnim === 'leave' ? 0 : 1,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            width: '100%', maxWidth: 480, margin: '0 auto',
            background: '#fff', borderRadius: '16px 16px 0 0',
            padding: 16, zIndex: 301, boxSizing: 'border-box',
            willChange: 'transform',
            transition: 'transform 0.2s ease-out',
            transform: buyAnim === 'enter' ? 'translateY(0)' : 'translateY(100%)',
          }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <Cover src={images[0]} seed={`p${id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Price value={data.price} original={data.original_price} />
                <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {data.title}
                </div>
                <div style={{ color: 'var(--text-light)', fontSize: 12, marginTop: 4 }}>库存 {data.stock} 件</div>
              </div>
              <button onClick={closeBuy} style={{ fontSize: 20, color: 'var(--text-light)' }}>×</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <span>数量</span>
              <div className="stepper">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="num">{qty}</span>
                <button onClick={() => setQty(q => q + 1)}>+</button>
              </div>
            </div>
            <button
              className="btn primary block"
              style={{ marginTop: 8 }}
              onClick={() => { closeBuy(); buyMode === 'cart' ? addToCart() : buyNow(); }}
            >
              {buyMode === 'cart' ? '确定' : '立即购买'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
