import { NavLink } from 'react-router-dom';
import { useCart } from '../store/cart.jsx';

const tabs = [
  { to: '/', icon: '🏠', label: '首页', end: true },
  { to: '/category', icon: '🗂️', label: '分类' },
  { to: '/messages', icon: '💬', label: '消息' },
  { to: '/cart', icon: '🛒', label: '购物车' },
  { to: '/profile', icon: '👤', label: '我的' },
];

export default function Tabbar() {
  const { count } = useCart();
  const badge = (to, inner) => {
    if (to === '/cart' && count > 0) return inner;
    if (to === '/messages') return <span style={{
      position: 'absolute', top: -4, right: -8, background: 'var(--red)', color: '#fff',
      fontSize: 10, minWidth: 16, height: 16, lineHeight: '16px',
      borderRadius: 8, padding: '0 4px', fontWeight: 600,
    }}>17</span>;
    return null;
  };
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="icon" style={{ position: 'relative' }}>
            {t.icon}
            {badge(t.to, (
              <span style={{
                position: 'absolute', top: -4, right: -8,
                background: 'var(--red)', color: '#fff',
                fontSize: 10, minWidth: 16, height: 16, lineHeight: '16px',
                borderRadius: 8, padding: '0 4px', fontWeight: 600,
              }}>{count > 99 ? '99+' : count}</span>
            ))}
          </span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
