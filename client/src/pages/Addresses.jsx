import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { addressApi } from '../api/modules.js';
import { useUser } from '../store/user.jsx';
import { useToast } from '../store/toast.jsx';
import Navbar from '../components/Navbar.jsx';
import Empty from '../components/Empty.jsx';

export default function Addresses() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { show } = useToast();
  const [list, setList] = useState([]);

  const load = () => addressApi.list().then(setList).catch(() => {});
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    load();
  }, [user]);

  const remove = async (id) => {
    if (!confirm('删除该地址？')) return;
    await addressApi.remove(id);
    show('已删除'); load();
  };

  const setDefault = async (addr) => {
    await addressApi.update(addr.id, { ...addr, is_default: true });
    load();
  };

  const pick = (addr) => {
    if (params.get('from') === 'checkout') {
      // 回到 checkout 时不持久化，但需要刷新——简化：用 history back
      navigate(-1);
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <Navbar title="收货地址" />
      {list.length === 0 ? (
        <Empty emoji="📍" text="还没有收货地址" />
      ) : (
        list.map((a) => (
          <div key={a.id} className="card" style={{ padding: 14 }}>
            <div onClick={() => pick(a)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{a.name}</span>
                <span>{a.phone}</span>
                {a.is_default ? <span className="tag">默认</span> : null}
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 13 }}>
                {a.province}{a.city}{a.district}{a.detail}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 13 }}>
              {!a.is_default && <span style={{ color: 'var(--text-secondary)' }} onClick={() => setDefault(a)}>设为默认</span>}
              <Link to={`/addresses/edit?id=${a.id}`} style={{ color: 'var(--text-secondary)' }}>编辑</Link>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }} onClick={() => remove(a.id)}>删除</span>
            </div>
          </div>
        ))
      )}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid var(--border)',
        padding: '12px 14px calc(12px + var(--safe-bottom))', zIndex: 200,
      }}>
        <Link to="/addresses/edit" className="btn primary block">+ 新增收货地址</Link>
      </div>
    </div>
  );
}
