import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Plus, Eye, Filter, UserPlus, BedDouble, Phone } from 'lucide-react';
import { fetchApi, formatMoney, formatDate, depositStatusBadge } from '@/utils/api';

interface ResidentRow {
  id: string; name: string; gender: string; birth_date: string; id_card: string;
  nursing_level: string; bed_id: string; bed_label: string; admit_date: string;
  emergency_contact: string; emergency_phone: string; status: string;
  created_at: string; updated_at: string;
}
interface BedRow {
  id: string; room_number: string; bed_number: string; floor: number;
  room_type: string; status: string; resident_id?: string; resident_name?: string; daily_rate: number;
}

const NURSING_LEVELS = ['自理', '半护理', '全护理', '特护'];
const STATUSES = ['在住', '退住'];

const nursingBadge = (level: string) => {
  const map: Record<string, string> = { '自理': 'badge-green', '半护理': 'badge-teal', '全护理': 'badge-amber', '特护': 'badge-red' };
  return map[level] || 'badge-gray';
};
const statusBadge = (status: string) => status === '在住' ? 'badge-green' : 'badge-gray';
const calcAge = (birth: string) => {
  if (!birth) return '-';
  const d = new Date(birth), now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
};

const emptyForm = { name: '', gender: '男', birthDate: '', idCard: '', nursingLevel: '自理', bedId: '', admitDate: '', emergencyContact: '', emergencyPhone: '', depositAmount: '' };

export default function ArchivePage() {
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [beds, setBeds] = useState<BedRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<ResidentRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadResidents = useCallback(async () => {
    const data = await fetchApi<ResidentRow[]>('/residents');
    if (data) setResidents(data);
  }, []);

  const loadBeds = useCallback(async () => {
    const data = await fetchApi<BedRow[]>('/beds');
    if (data) setBeds(data);
  }, []);

  useEffect(() => { loadResidents(); loadBeds(); }, [loadResidents, loadBeds]);

  const availableBeds = beds.filter(b => b.status === '空');

  const filtered = residents.filter(r => {
    if (search && !r.name.includes(search) && !r.id_card.includes(search)) return false;
    if (filterLevel && r.nursing_level !== filterLevel) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const handleAdd = async () => {
    setSaving(true);
    await fetchApi('/residents', {
      method: 'POST',
      body: JSON.stringify({ ...form, depositAmount: Number(form.depositAmount) || 0 }),
    });
    setShowAdd(false);
    setForm(emptyForm);
    setSaving(false);
    loadResidents();
    loadBeds();
  };

  const openDetail = (r: ResidentRow) => { setSelected(r); setShowDetail(true); };

  const updateForm = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div style={{ padding: 24 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={22} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--color-text)' }}>入住档案</h2>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
            <UserPlus size={16} /> 新增入住
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input className="input" placeholder="搜索姓名/身份证号" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
            <select className="select" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
              <option value="">全部护理等级</option>
              {NURSING_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">全部状态</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card table-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid var(--color-border)` }}>
              {['姓名', '性别', '年龄', '护理等级', '床位', '入住日期', '紧急联系人', '状态', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>暂无数据</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} style={{ borderBottom: `1px solid var(--color-border)` }}>
                <td style={{ padding: '10px 12px', color: 'var(--color-text)', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text)' }}>{r.gender}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text)' }}>{calcAge(r.birth_date)}</td>
                <td style={{ padding: '10px 12px' }}><span className={`badge ${nursingBadge(r.nursing_level)}`}>{r.nursing_level}</span></td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text)' }}>{r.bed_label || '-'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{formatDate(r.admit_date)}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{r.emergency_contact}</td>
                <td style={{ padding: '10px 12px' }}><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                <td style={{ padding: '10px 12px' }}>
                  <button className="btn btn-ghost" onClick={() => openDetail(r)}><Eye size={15} /> 详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-overlay animate-fadeIn" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <UserPlus size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ margin: 0, color: 'var(--color-text)' }}>新增入住</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>姓名</label><input className="input" value={form.name} onChange={e => updateForm('name', e.target.value)} /></div>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>性别</label><select className="select" value={form.gender} onChange={e => updateForm('gender', e.target.value)}><option>男</option><option>女</option></select></div>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>出生日期</label><input className="input" type="date" value={form.birthDate} onChange={e => updateForm('birthDate', e.target.value)} /></div>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>身份证号</label><input className="input" value={form.idCard} onChange={e => updateForm('idCard', e.target.value)} /></div>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>护理等级</label><select className="select" value={form.nursingLevel} onChange={e => updateForm('nursingLevel', e.target.value)}>{NURSING_LEVELS.map(l => <option key={l}>{l}</option>)}</select></div>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>床位</label><select className="select" value={form.bedId} onChange={e => updateForm('bedId', e.target.value)}><option value="">选择床位</option>{availableBeds.map(b => <option key={b.id} value={b.id}>{b.room_number}-{b.bed_number}</option>)}</select></div>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>入住日期</label><input className="input" type="date" value={form.admitDate} onChange={e => updateForm('admitDate', e.target.value)} /></div>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>押金金额</label><input className="input" type="number" value={form.depositAmount} onChange={e => updateForm('depositAmount', e.target.value)} placeholder="0" /></div>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>紧急联系人</label><input className="input" value={form.emergencyContact} onChange={e => updateForm('emergencyContact', e.target.value)} /></div>
              <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>联系电话</label><input className="input" value={form.emergencyPhone} onChange={e => updateForm('emergencyPhone', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn btn-primary" disabled={saving || !form.name} onClick={handleAdd}>{saving ? '提交中...' : '确认入住'}</button>
            </div>
          </div>
        </div>
      )}

      {showDetail && selected && (
        <div className="modal-overlay animate-fadeIn" onClick={() => setShowDetail(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Eye size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ margin: 0, color: 'var(--color-text)' }}>档案详情</h3>
              <span className={`badge ${statusBadge(selected.status)}`} style={{ marginLeft: 'auto' }}>{selected.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>姓名</span><p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: 500 }}>{selected.name}</p></div>
              <div><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>性别</span><p style={{ margin: '2px 0 0', color: 'var(--color-text)' }}>{selected.gender}</p></div>
              <div><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>年龄</span><p style={{ margin: '2px 0 0', color: 'var(--color-text)' }}>{calcAge(selected.birth_date)} 岁</p></div>
              <div><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>身份证号</span><p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)' }} className="font-mono">{selected.id_card}</p></div>
              <div><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>护理等级</span><p style={{ margin: '2px 0 0' }}><span className={`badge ${nursingBadge(selected.nursing_level)}`}>{selected.nursing_level}</span></p></div>
              <div><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>床位</span><p style={{ margin: '2px 0 0', color: 'var(--color-text)' }}><BedDouble size={14} style={{ display: 'inline', verticalAlign: -2 }} /> {selected.bed_label || '-'}</p></div>
              <div><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>入住日期</span><p style={{ margin: '2px 0 0', color: 'var(--color-text)' }}>{formatDate(selected.admit_date)}</p></div>
              <div><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>紧急联系人</span><p style={{ margin: '2px 0 0', color: 'var(--color-text)' }}>{selected.emergency_contact}</p></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>联系电话</span><p style={{ margin: '2px 0 0', color: 'var(--color-text)' }}><Phone size={14} style={{ display: 'inline', verticalAlign: -2 }} /> {selected.emergency_phone}</p></div>
            </div>
            <div style={{ borderTop: `1px solid var(--color-border)`, marginTop: 16, paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>押金信息</span>
                {selected.status === '在住' && <span className="badge badge-green">押金在押</span>}
                {selected.status === '退住' && <span className="badge badge-gray">已结算</span>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>护理等级变更记录将在后续版本展示</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setShowDetail(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
