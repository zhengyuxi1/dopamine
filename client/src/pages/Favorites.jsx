import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { favoriteApi } from '../api/modules.js';
import { useUser } from '../store/user.jsx';
import { useToast } from '../store/toast.jsx';
import Navbar from '../components/Navbar.jsx';
import Cover from '../components/Cover.jsx';
import Price from '../components/Price.jsx';
import Empty from '../components/Empty.jsx';

export default function Favorites() {
  const { user } = useUser();
  const { show } = useToast();
  const [list, setList] = useState([]);

  const load = () => favoriteApi.list().then(setList).catch(() => {});
  useEffect(() => { if (user) load(); }, [user]);

  const remove = async (productId) => {
    await favoriteApi.toggle(productId);
    show('已取消收藏');
    load();
  };

  return (
    <div className="page">
      <Navbar title="我的收藏" />
      {!user ? <Empty emoji="❤️" text="请先登录" /> :
        list.length === 0 ? <Empty emoji="❤️" text="还没有收藏商品" action={<Link className="btn primary" to="/">去逛逛</Link>} /> :
        list.map((f) => (
          <div key={f.fav_id} className="card" style={{ padding: 12, display: 'flex', gap: 10 }}>
            <Link to={`/product/${f.id}`} style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <Cover src={f.cover} seed={`p${f.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Link>
            <div style={{ flex: 1 }}>
              <Link to={`/product/${f.id}`} style={{ fontSize: 14, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.title}</Link>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <Price value={f.price} />
                <span style={{ color: 'var(--text-light)', fontSize: 12 }} onClick={() => remove(f.id)}>取消收藏</span>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}
