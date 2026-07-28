import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addressApi } from '../api/modules.js';
import { useUser } from '../store/user.jsx';
import { useToast } from '../store/toast.jsx';
import Navbar from '../components/Navbar.jsx';

export default function AddressEdit() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const { user } = useUser();
  const { show } = useToast();
  const [form, setForm] = useState({
    name: '', phone: '', province: '', city: '', district: '', detail: '', is_default: false,
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (id) {
      addressApi.list().then(list => {
        const a = list.find(x => String(x.id) === id);
        if (a) setForm({ ...a, is_default: !!a.is_default });
      });
    }
  }, [id, user]);

  const save = async () => {
    if (!form.name || !form.phone || !form.detail) return show('请填写姓名、电话、详细地址');
    if (!/^1[3-9]\d{9}$/.test(form.phone)) return show('手机号格式不正确');
    try {
      if (id) await addressApi.update(id, form);
      else await addressApi.create(form);
      show('保存成功');
      navigate(-1);
    } catch (err) { show(err.message); }
  };

  return (
    <div className="page">
      <Navbar title={id ? '编辑地址' : '新增地址'} />
      <div className="card" style={{ padding: 0 }}>
        <div className="field"><label>姓名</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="收货人姓名" />
        </div>
        <div className="field"><label>手机号</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="手机号码" />
        </div>
        <div className="field"><label>省</label>
          <input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="如：广东省" />
        </div>
        <div className="field"><label>市</label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="如：广州市" />
        </div>
        <div className="field"><label>区/县</label>
          <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="如：天河区" />
        </div>
        <div className="field"><label>详细地址</label>
          <input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="街道门牌号" />
        </div>
        <div className="field">
          <label>设为默认</label>
          <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            style={{ flex: 'none' }} />
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <button className="btn primary block" onClick={save}>保存</button>
      </div>
    </div>
  );
}
