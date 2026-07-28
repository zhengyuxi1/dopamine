import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

// 消息分类（mock 数据，展示用）
const UTIL = [
  { key: 'logistics', icon: '🚚', name: '交易物流', color: '#ff7a45', preview: '暂无包裹动态更新', time: '' },
  { key: 'aftersale', icon: '↩️', name: '售后保障', color: '#1677ff', preview: '您的订单即将自动确认收货', time: '星期五' },
];

const RECENT = [
  { key: 'ai', icon: '✨', name: 'AI购物助手', color: 'linear-gradient(135deg,#ff7a45,#ff5000)', preview: 'Hi! 我是你的购物助手~帮你挑好物、找优惠! 有什么需要，都可以来找我~', time: '26/05/10', badge: 0, chat: true },
  { key: 'promo', icon: '￥', name: '活动优惠', color: '#ff2442', preview: '您关注的商品降价了，快来看看', time: '18:30', badge: 5 },
  { key: 'game', icon: '👾', name: '互动娱乐', color: '#ff5000', preview: '1500肥料待领取，快来阳光农场', time: '17:20', badge: 3 },
  { key: 'group', icon: '👥', name: '折叠的群聊', color: '#52c41a', preview: '[现金红包] 恭喜发财，大吉大利', time: '12:05', dot: true },
  { key: 'coin', icon: '🪙', name: '多巴胺币助手', color: '#faad14', preview: '今日多巴胺币已到账，记得签到', time: '昨天', badge: 5 },
  { key: 'flash', icon: '⚡', name: '限时秒杀通知', color: '#ff5000', preview: '秒杀商品即将开抢，提前加购', time: '昨天', badge: 4 },
  { key: 'service', icon: '🔔', name: '服务提醒', color: '#faad14', preview: '您的订单已发货，注意查收', time: '星期三', badge: 0 },
  { key: 'store', icon: '🏬', name: '多巴胺官方旗舰店', color: '#1677ff', preview: '您好，新品上架啦，专属优惠券已发放', time: '星期二', badge: 0 },
];

const OLD = [
  { key: 'store2', icon: '🏬', name: '美味零食铺', color: '#722ed1', preview: '感谢您的购买，欢迎再来', time: '两周前', badge: 0 },
];

export default function Messages() {
  const navigate = useNavigate();
  const [total] = useState(17);

  const onItemClick = (it) => {
    if (it.chat) navigate('/messages/chat');
    else navigate('/orders');
  };

  return (
    <div className="page">
      <div className="navbar" style={{ background: '#fff', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
        <span className="title" style={{ padding: 0, textAlign: 'left', fontWeight: 700, fontSize: 18 }}>
          消息 ({total})
        </span>
        <span className="right" style={{ display: 'flex', gap: 14, color: 'var(--text-secondary)', fontSize: 14 }}>
          <span>🗑️ 清除</span>
          <span>🔍</span>
          <span>＋</span>
        </span>
      </div>

      {/* 高优先级工具区 */}
      <div style={{ background: '#f5f5f5', padding: '8px 0' }}>
        <div className="msg-list">
          {UTIL.map((it) => (
            <div key={it.key} className="msg-item" onClick={onItemClick.bind(null, it)}>
              <div className="avatar" style={{ background: it.color }}>{it.icon}</div>
              <div className="mid">
                <div className="name">{it.name}</div>
                <div className="preview">{it.preview}</div>
              </div>
              <div className="right"><div className="time">{it.time}</div></div>
            </div>
          ))}
        </div>

        <div className="msg-section-header">最近消息</div>
        <div className="msg-list">
          {RECENT.map((it) => (
            <div key={it.key} className="msg-item" onClick={() => onItemClick(it)}>
              <div className="avatar" style={{ background: it.color }}>{it.icon}</div>
              <div className="mid">
                <div className="name">{it.name}</div>
                <div className="preview">{it.preview}</div>
              </div>
              <div className="right">
                <div className="time">{it.time}</div>
                {it.badge > 0 && <div className="dot">{it.badge}</div>}
                {it.dot && <div className="dot" style={{ background: '#faad14', width: 10, height: 10, padding: 0, borderRadius: '50%' }} />}
              </div>
            </div>
          ))}
        </div>

        <div className="msg-section-header">两周前的消息</div>
        <div className="msg-list">
          {OLD.map((it) => (
            <div key={it.key} className="msg-item" onClick={() => onItemClick(it)}>
              <div className="avatar" style={{ background: it.color }}>{it.icon}</div>
              <div className="mid">
                <div className="name">{it.name}</div>
                <div className="preview">{it.preview}</div>
              </div>
              <div className="right"><div className="time">{it.time}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
