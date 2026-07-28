import { useNavigate } from 'react-router-dom';
import { useUser } from '../store/user.jsx';
import Navbar from '../components/Navbar.jsx';

export default function Settings() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const items = [
    { label: '清除缓存', desc: '清除本地缓存数据', action: () => alert('缓存已清除') },
    { label: '关于我们', desc: '多巴胺商店 v1.0', action: () => alert('多巴胺商店 - 虚拟购物体验') },
    { label: '退出登录', desc: '', action: async () => { await logout(); navigate('/'); } },
  ];

  return (
    <div className="page">
      <Navbar title="设置" />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {items.map((it, i) => (
          <div key={i} onClick={() => user ? it.action() : navigate('/login')}
            style={{ padding: '14px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>{it.label}</div>
              {it.desc && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>{it.desc}</div>}
            </div>
            <span style={{ color: 'var(--text-light)' }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
