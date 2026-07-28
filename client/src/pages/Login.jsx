import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../store/user.jsx';
import { useToast } from '../store/toast.jsx';
import Navbar from '../components/Navbar.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useUser();
  const { show } = useToast();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: 'demo', password: '123456', nickname: '' });
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'login') await login({ username: form.username, password: form.password });
      else await register(form);
      show('登录成功');
      navigate(-1);
    } catch (err) {
      show(err.message);
    }
  };

  return (
    <div className="page">
      <Navbar title={mode === 'login' ? '登录' : '注册'} />
      <div style={{ padding: 30, textAlign: 'center', background: 'var(--primary)', color: '#fff' }}>
        <div style={{ fontSize: 48 }}>🛍️</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>多巴胺商店</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>购物的快乐，无需付款</div>
      </div>

      <form onSubmit={submit} style={{ padding: 20 }}>
        <div className="field">
          <label>用户名</label>
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="请输入用户名" />
        </div>
        <div className="field">
          <label>密码</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="请输入密码" />
        </div>
        {mode === 'register' && (
          <div className="field">
            <label>昵称</label>
            <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              placeholder="选填" />
          </div>
        )}
        <button type="submit" className="btn primary block" style={{ marginTop: 20 }}>
          {mode === 'login' ? '登 录' : '注 册'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
          {mode === 'login' ? '没有账号？' : '已有账号？'}
          <a style={{ color: 'var(--primary)' }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? '去注册' : '去登录'}
          </a>
        </div>
        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--text-light)', fontSize: 12 }}>
            体验账号：demo / 123456
          </div>
        )}
      </form>
    </div>
  );
}
