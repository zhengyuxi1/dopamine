import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { productApi } from '../api/modules.js';
import GoodsCard from '../components/GoodsCard.jsx';
import Empty from '../components/Empty.jsx';

export default function SearchResult() {
  const [params] = useSearchParams();
  const kw = params.get('keyword') || '';
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('default');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => { setPage(1); }, [kw, sort]);

  useEffect(() => {
    setLoading(true);
    productApi.list({ keyword: kw, sort, page, pageSize: 20 })
      .then(r => {
        setList(page === 1 ? r.list : [...list, ...r.list]);
        setHasMore(r.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kw, sort, page]);

  const sorts = [
    { key: 'default', label: '综合' },
    { key: 'sales', label: '销量' },
    { key: 'price_asc', label: '价格↑' },
    { key: 'price_desc', label: '价格↓' },
  ];

  return (
    <div className="page">
      <div className="navbar white">
        <span className="back" onClick={() => navigate(-1)}>‹</span>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
          “{kw}” 的搜索结果
        </div>
        <span className="right" style={{ width: 32 }} />
      </div>

      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid var(--border)', padding: '10px 4px' }}>
        {sorts.map((s) => (
          <button key={s.key} onClick={() => setSort(s.key)} style={{
            flex: 1, fontSize: 13,
            color: sort === s.key ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: sort === s.key ? 600 : 400,
          }}>{s.label}</button>
        ))}
      </div>

      {loading && page === 1 ? (
        <div className="loading">加载中...</div>
      ) : list.length === 0 ? (
        <Empty emoji="🔍" text={`没有找到“${kw}”相关商品`} />
      ) : (
        <>
          <div className="grid-2">
            {list.map((p) => <GoodsCard key={p.id} product={p} />)}
          </div>
          {hasMore ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <button className="btn" onClick={() => setPage(p => p + 1)}>加载更多</button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 12, padding: 16 }}>
              — 没有更多了 —
            </div>
          )}
        </>
      )}
    </div>
  );
}
