import { useState, useEffect, useCallback } from 'react';
import { BedDouble, Users, Home, Eye, ArrowRight } from 'lucide-react';
import { fetchApi, formatMoney, bedStatusBadge } from '@/utils/api';

interface BedRow {
  id: string; room_number: string; bed_number: string; floor: number;
  room_type: string; status: string; resident_id?: string; resident_name?: string; daily_rate: number;
}

const FLOORS = [1, 2, 3];

const STATUS_STYLE: Record<string, { border: string; bg: string }> = {
  '空': { border: '2px solid #22c55e', bg: '#f0fdf4' },
  '已住': { border: '2px solid #14b8a6', bg: '#f0fdfa' },
  '待转出': { border: '2px solid #f59e0b', bg: '#fffbeb' },
  '待转入': { border: '2px solid #3b82f6', bg: '#eff6ff' },
};

export default function BedsPage() {
  const [beds, setBeds] = useState<BedRow[]>([]);
  const [floor, setFloor] = useState(1);
  const [selected, setSelected] = useState<BedRow | null>(null);

  const loadBeds = useCallback(async () => {
    const data = await fetchApi<BedRow[]>('/beds');
    if (data) setBeds(data);
  }, []);

  useEffect(() => { loadBeds(); }, [loadBeds]);

  const filtered = beds.filter(b => b.floor === floor);
  const stats = {
    total: filtered.length,
    occupied: filtered.filter(b => b.status === '已住').length,
    vacant: filtered.filter(b => b.status === '空').length,
    pending: filtered.filter(b => b.status === '待转出' || b.status === '待转入').length,
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <BedDouble size={28} style={{ color: 'var(--color-primary)' }} />
        <h2 style={{ margin: 0, fontSize: 22, color: 'var(--color-text)' }}>床位总览</h2>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {FLOORS.map(f => (
          <button key={f} className={floor === f ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => setFloor(f)}>{f}F</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { icon: <Home size={16} />, label: '总床位', value: stats.total, color: 'var(--color-primary)' },
          { icon: <Users size={16} />, label: '已住', value: stats.occupied, color: '#14b8a6' },
          { icon: <BedDouble size={16} />, label: '空床', value: stats.vacant, color: '#22c55e' },
          { icon: <ArrowRight size={16} />, label: '待处理', value: stats.pending, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card" style={{
            padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 120,
          }}>
            <span style={{ color: s.color }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.label}</div>
              <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12,
      }}>
        {filtered.map(bed => {
          const style = STATUS_STYLE[bed.status] || STATUS_STYLE['空'];
          return (
            <div key={bed.id} className="card" style={{
              border: style.border, backgroundColor: style.bg, padding: 14,
              cursor: 'pointer', transition: 'transform 0.15s',
            }} onClick={() => setSelected(bed)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                  {bed.room_number}-{bed.bed_number}
                </span>
                <span className={`badge ${bedStatusBadge(bed.status)}`}>{bed.status}</span>
              </div>
              {bed.resident_name && (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <Users size={12} style={{ marginRight: 4, verticalAlign: -1 }} />{bed.resident_name}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {bed.room_type} · {formatMoney(bed.daily_rate)}/天
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="modal-overlay animate-fadeIn" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--color-text)' }}>
                {selected.room_number}-{selected.bed_number} 床位详情
              </h3>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['楼层', `${selected.floor}F`],
                ['房间号', selected.room_number],
                ['床号', selected.bed_number],
                ['房型', selected.room_type],
                ['状态', selected.status],
                ['日费率', formatMoney(selected.daily_rate)],
                ['住户', selected.resident_name || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{k}</span>
                  <span style={{ color: 'var(--color-text)', fontSize: 14, fontWeight: 500 }} className={k === '状态' ? `badge ${bedStatusBadge(v)}` : ''}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1 }}>
                <Eye size={14} style={{ marginRight: 4 }} />押金记录
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }}>
                <ArrowRight size={14} style={{ marginRight: 4 }} />办理业务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
