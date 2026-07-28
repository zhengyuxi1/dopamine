import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productApi } from '../api/modules.js';
import Navbar from '../components/Navbar.jsx';
import Cover from '../components/Cover.jsx';

export default function Chat() {
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState([
    { role: 'assistant', text: 'Hi！我是你的AI购物助手 🛍️ 帮你挑好物、找优惠！想买点什么？试试说"推荐T恤"或"有什么便宜的耳机"' },
  ]);
  const [input, setInput] = useState('');
  const [pool, setPool] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    productApi.list({ pageSize: 30 }).then(r => setPool(r.list)).catch(() => {});
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const reply = (text) => {
    const t = text.toLowerCase();
    let matches = [];
    const kw = ['tshirt', 't恤', 'shirt'].some(k => t.includes(k)) ? 'T恤'
      : ['耳机', 'earphone', 'earbuds'].some(k => t.includes(k)) ? '耳机'
      : ['口红', 'lipstick'].some(k => t.includes(k)) ? '口红'
      : ['咖啡', 'coffee'].some(k => t.includes(k)) ? '咖啡'
      : ['便宜', '低价', '划算', '优惠'].some(k => t.includes(k)) ? '低价'
      : ['推荐', '买什么', '好物'].some(k => t.includes(k)) ? '推荐'
      : null;
    if (kw === '低价') matches = [...pool].sort((a,b) => a.price - b.price).slice(0, 2);
    else if (kw) matches = pool.filter(p => p.title.includes(kw)).slice(0, 2);
    if (!matches.length) matches = [...pool].sort((a,b) => b.sales - a.sales).slice(0, 2);

    const text2 = kw
      ? `为你找到${kw === '推荐' || kw === '低价' ? '热门好物' : kw + '相关'}，看看这几款 👇`
      : `不太懂你的意思，先给你推荐两款热销商品吧 👇`;
    setMsgs(m => [...m, { role: 'assistant', text: text2, recs: matches }]);
  };

  const send = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMsgs(m => [...m, { role: 'user', text }]);
    setInput('');
    setTimeout(() => reply(text), 350);
  };

  const quick = ['推荐好物', '有什么便宜的', '找T恤', '想买耳机'];

  return (
    <div className="page" style={{ background: '#f4f4f4', paddingBottom: 70 }}>
      <Navbar title="AI购物助手" right={<span style={{ color: 'var(--text-light)' }} onClick={() => navigate(-1)}>×</span>} />
      <div className="chat-window">
        {msgs.map((m, i) => (
          <div key={i}>
            <div className={`chat-bubble ${m.role}`}>
              {m.text}
              {m.recs?.length > 0 && m.recs.map(r => (
                <Link to={`/product/${r.id}`} key={r.id} className="rec-card">
                  <Cover src={r.cover} seed={`p${r.id}`} style={{ width: 50, height: 50 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.title}</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 600, marginTop: 4 }}>¥{r.price}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* 快捷问 */}
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', overflowX: 'auto' }} className="no-scrollbar">
        {quick.map(q => (
          <span key={q} onClick={() => { setInput(q); }} style={{ flex: '0 0 auto', background: '#fff', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{q}</span>
        ))}
      </div>

      <div className="chat-input-bar">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="说点什么..." />
        <button onClick={send}>发送</button>
      </div>
    </div>
  );
}
