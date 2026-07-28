import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categoryApi } from '../api/modules.js';
import GoodsCard from '../components/GoodsCard.jsx';

export default function Category() {
  const [params, setParams] = useSearchParams();
  const [cats, setCats] = useState([]);
  const [active, setActive] = useState(params.get('cat') || '');
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => { categoryApi.list().then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    if (cats.length && !active) setActive(cats[0].id);
  }, [cats, active]);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    setParams({ cat: active });
    categoryApi.products(active, { sort })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [active, sort]);

  const sorts = [
    { key: 'default', label: '综合' },
    { key: 'sales', label: '销量' },
    { key: 'price_asc', label: '价格↑' },
    { key: 'price_desc', label: '价格↓' },
  ];

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="navbar">
        <span className="title" style={{ padding: 0 }}>分类</span>
      </div>
      <div style={{ display: 'flex', flex: 1 }}>
        {/* 左侧分类 */}
        <div style={{ width: 88, background: '#f0f0f0', flexShrink: 0 }}>
          {cats.map((c) => (
            <div
              key={c.id}
              onClick={() => setActive(c.id)}
              style={{
                padding: '16px 8px', textAlign: 'center', fontSize: 13,
                background: Number(active) === c.id ? '#fff' : 'transparent',
                color: Number(active) === c.id ? 'var(--primary)' : 'var(--text)',
                fontWeight: Number(active) === c.id ? 600 : 400,
                borderLeft: Number(active) === c.id ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              <div style={{ fontSize: 20 }}>{c.icon}</div>
              <div style={{ marginTop: 4 }}>{c.name}</div>
            </div>
          ))}
        </div>
        {/* 右侧商品 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid var(--border)', padding: '10px 4px' }}>
            {sorts.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                style={{
                  flex: 1, padding: '4px 0', fontSize: 13,
                  color: sort === s.key ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: sort === s.key ? 600 : 400,
                }}
              >{s.label}</button>
            ))}
          </div>
          {loading ? (
            <div className="loading">加载中...</div>
          ) : products.length === 0 ? (
            <div className="empty" style={{ padding: 40 }}><div className="emoji">📦</div><div className="text">该分类暂无商品</div></div>
          ) : (
            <div className="grid-2" style={{ padding: 8, marginTop: 0 }}>
              {products.map((p) => <GoodsCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
