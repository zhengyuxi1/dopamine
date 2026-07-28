import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { couponApi } from '../api/modules.js';
import { useUser } from '../store/user.jsx';
import { useToast } from '../store/toast.jsx';
import Navbar from '../components/Navbar.jsx';
import Empty from '../components/Empty.jsx';

function couponDesc(c) {
  if (c.type === 'cash') return `满${c.condition_amount}可用`.replace('满0可用', '无门槛');
  if (c.type === 'discount') return `全场${c.value / 10}折`;
  return `满${c.condition_amount}减${c.value}`;
}

export default function Coupons() {
  const { user } = useUser();
  const { show } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('available');
  const [coupons, setCoupons] = useState([]);
  const [myCoupons, setMyCoupons] = useState([]);

  useEffect(() => {
    if (!user) return;
    couponApi.list().then(setCoupons).catch(() => {});
    couponApi.my().then(setMyCoupons).catch(() => {});
  }, [user]);

  const claim = async (id) => {
    try {
      await couponApi.claim(id);
      show('领取成功！');
      // 刷新
      couponApi.list().then(setCoupons).catch(() => {});
      couponApi.my().then(setMyCoupons).catch(() => {});
    } catch (e) {
      show(e.response?.data?.error || '领取失败');
    }
  };

  if (!user) {
    return (
      <div className="page">
        <Navbar title="领券中心" />
        <Empty emoji="🧧" text="请先登录" action={<button className="btn primary" onClick={() => navigate('/login')}>去登录</button>} />
      </div>
    );
  }

  return (
    <div className="page" style={{ background: '#f4f4f4' }}>
      <Navbar title="领券中心" />

      {/* 头部横幅 */}
      <div style={{
        background: 'linear-gradient(135deg, #ff5000, #ff2442)',
        padding: '20px 16px', color: '#fff', textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>🧧</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>天天领红包，省上加省</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>海量优惠券等你来领</div>
      </div>

      {/* 选项卡 */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid var(--border)' }}>
        {[
          { k: 'available', label: '可领取' },
          { k: 'mine', label: '我的优惠券' },
        ].map((t) => (
          <div key={t.k} onClick={() => setTab(t.k)} style={{
            flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 14,
            color: tab === t.k ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: tab === t.k ? 600 : 400,
            borderBottom: tab === t.k ? '2px solid var(--primary)' : '2px solid transparent',
          }}>{t.label}</div>
        ))}
      </div>

      {/* 可领取列表 */}
      {tab === 'available' && (
        coupons.length === 0 ? <Empty emoji="🧧" text="暂无可用优惠券" /> :
        <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coupons.map((c) => {
            const claimed = c.user_claimed > 0;
            return (
              <div key={c.id} className="card" style={{
                margin: 0, display: 'flex', overflow: 'hidden', borderRadius: 10,
              }}>
                {/* 左侧金额区 */}
                <div style={{
                  width: 100, background: c.bg_color, color: '#fff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '12px 0',
                  position: 'relative',
                }}>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>{c.type === 'discount' ? '折扣' : '优惠券'}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                    {c.type === 'discount' ? `${c.value / 10}` : c.value}
                    <span style={{ fontSize: 12 }}>{c.type === 'discount' ? '折' : '元'}</span>
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{couponDesc(c)}</div>
                  {/* 半圆缺口 */}
                  <div style={{
                    position: 'absolute', right: -6, top: '50%', marginTop: -6,
                    width: 12, height: 12, borderRadius: '50%', background: '#f4f4f4',
                  }} />
                </div>
                {/* 右侧信息 */}
                <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>{c.subtitle}</div>
                  {c.total > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      已领 {c.claimed}/{c.total} 张
                    </div>
                  )}
                </div>
                {/* 领取按钮 */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                  <button
                    className={claimed ? 'btn' : 'btn primary'}
                    disabled={claimed}
                    onClick={() => claim(c.id)}
                    style={{ padding: '6px 14px', fontSize: 12, borderRadius: 999 }}
                  >
                    {claimed ? '已领取' : '立即领取'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 我的优惠券 */}
      {tab === 'mine' && (
        myCoupons.length === 0 ? <Empty emoji="🧧" text="还没有领取过优惠券" action={<button className="btn primary" onClick={() => setTab('available')}>去领券</button>} /> :
        <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myCoupons.map((uc) => {
            const isUsed = uc.status === 'used';
            const isExpired = uc.status === 'expired';
            const disabled = isUsed || isExpired;
            return (
              <div key={uc.uc_id} className="card" style={{
                margin: 0, display: 'flex', overflow: 'hidden', borderRadius: 10,
                opacity: disabled ? 0.5 : 1,
              }}>
                <div style={{
                  width: 100, background: disabled ? '#ccc' : uc.bg_color || '#ff5000', color: '#fff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '12px 0', position: 'relative',
                }}>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>{uc.type === 'discount' ? '折扣' : '优惠券'}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                    {uc.type === 'discount' ? `${uc.value / 10}` : uc.value}
                    <span style={{ fontSize: 12 }}>{uc.type === 'discount' ? '折' : '元'}</span>
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                    {uc.type === 'cash' ? `满${uc.condition_amount}可用`.replace('满0可用', '无门槛') : uc.type === 'discount' ? `全场${uc.value / 10}折` : `满${uc.condition_amount}减${uc.value}`}
                  </div>
                  <div style={{
                    position: 'absolute', right: -6, top: '50%', marginTop: -6,
                    width: 12, height: 12, borderRadius: '50%', background: '#f4f4f4',
                  }} />
                </div>
                <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{uc.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
                    {isUsed ? `已使用 · ${uc.used_at || ''}` : isExpired ? '已过期' : `领取于 ${uc.claimed_at}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                  <span style={{
                    fontSize: 12, padding: '3px 10px', borderRadius: 999,
                    background: disabled ? '#f5f5f5' : '#fff7e6',
                    color: disabled ? 'var(--text-light)' : 'var(--gold)',
                    fontWeight: 600,
                  }}>
                    {isUsed ? '已使用' : isExpired ? '已过期' : '可使用'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
