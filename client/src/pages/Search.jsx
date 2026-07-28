import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const hot = ['T恤', '耳机', '口红', '咖啡', '充电宝', '瑜伽垫', '围巾', '坚果'];

export default function Search() {
  const navigate = useNavigate();
  const [kw, setKw] = useState('');

  const go = (k) => navigate(`/search/result?keyword=${encodeURIComponent(k)}`);

  return (
    <div className="page">
      <div className="navbar white">
        <span className="back" onClick={() => navigate(-1)}>‹</span>
        <div style={{
          flex: 1, background: '#f5f5f5', borderRadius: 999,
          padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          🔍
          <input
            autoFocus
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && kw && go(kw)}
            placeholder="搜索商品"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent' }}
          />
        </div>
        <span className="right" style={{ color: 'var(--primary)', cursor: 'pointer', width: 40 }}
          onClick={() => kw && go(kw)}>搜索</span>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>🔥 热门搜索</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {hot.map((k) => (
            <span key={k} className="tag gray" style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={() => go(k)}>{k}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
