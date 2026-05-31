import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, ArrowRight, Check, AlertCircle, Calculator, Download, Eye, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { fetchApi, formatMoney, formatDate, eventStatusBadge, eventTypeBadge } from '@/utils/api';

interface EventRow {
  id: string; type: string; resident_id: string; resident_name: string;
  status: string; trigger_source: string; current_step: string; next_step: string;
  details: { originalBedId?: string; targetBedId?: string; originalBedLabel?: string; targetBedLabel?: string; originalNursingLevel?: string; targetNursingLevel?: string; reason: string; daysStaying?: number; };
  feeCalculation: { items: { name: string; amount: number; calculationBasis: string }[]; totalDue: number; totalRefund: number; netAmount: number; } | null;
  created_at: string; updated_at: string;
}
interface SettlementRow {
  id: string; event_id: string; resident_id: string; resident_name: string; type: string;
  depositSnapshot: any; feeCalculation: any; generated_at: string;
}
interface Resident { id: string; name: string; bed_id?: string; bed_label?: string; nursing_level?: string; }
interface Bed { id: string; room_number: string; bed_number: string; status: string; }

const STEPS = ['申请', '试算', '待确认', '已完成'];
const EVENT_TYPES = ['转房补差', '短住退押', '护理变更'];

export default function SettlementPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [settlement, setSettlement] = useState<SettlementRow | null>(null);
  const [formType, setFormType] = useState('转房补差');
  const [formResidentId, setFormResidentId] = useState('');
  const [formTargetBedId, setFormTargetBedId] = useState('');
  const [formTargetNursingLevel, setFormTargetNursingLevel] = useState('');
  const [formReason, setFormReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, res, bd] = await Promise.all([
        fetchApi<EventRow[]>('/events'),
        fetchApi<Resident[]>('/residents'),
        fetchApi<Bed[]>('/beds'),
      ]);
      setEvents(ev); setResidents(res); setBeds(bd);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedResident = residents.find(r => r.id === formResidentId);
  const emptyBeds = beds.filter(b => b.status === '空');

  const resetForm = () => {
    setFormType('转房补差'); setFormResidentId(''); setFormTargetBedId('');
    setFormTargetNursingLevel(''); setFormReason('');
  };

  const handleCreate = async () => {
    if (!formResidentId || !formReason) return;
    if (formType === '转房补差' && !formTargetBedId) return;
    if (formType === '护理变更' && !formTargetNursingLevel) return;
    setSubmitting(true);
    try {
      const details: any = { reason: formReason };
      if (formType === '转房补差') {
        details.originalBedId = selectedResident?.bed_id;
        details.targetBedId = formTargetBedId;
      } else if (formType === '护理变更') {
        details.originalNursingLevel = selectedResident?.nursing_level;
        details.targetNursingLevel = formTargetNursingLevel;
      }
      await fetchApi('/events', {
        method: 'POST',
        body: JSON.stringify({ type: formType, residentId: formResidentId, details, triggerSource: '手动发起' }),
      });
      setShowCreate(false); resetForm(); loadData();
    } catch { } finally { setSubmitting(false); }
  };

  const handleAdvance = async (id: string) => {
    try { await fetchApi(`/events/${id}/advance`, { method: 'POST' }); loadData(); } catch { }
  };

  const handleGenerate = async (id: string) => {
    try {
      const s = await fetchApi<SettlementRow>(`/settlements/generate/${id}`, { method: 'POST' });
      setSettlement(s); setShowSettlement(true);
    } catch { }
  };

  const handleViewSettlement = async (eventId: string) => {
    try {
      const all = await fetchApi<SettlementRow[]>('/settlements');
      const found = all.find((s: SettlementRow) => s.event_id === eventId);
      if (found) { setSettlement(found); setShowSettlement(true); }
    } catch { }
  };

  const openDetail = (ev: EventRow) => { setSelectedEvent(ev); setShowDetail(true); };

  const renderStepBar = (status: string) => {
    const idx = STEPS.indexOf(status);
    return (
      <div className="step-bar">
        {STEPS.map((step, i) => (
          <div key={step} className="step-item">
            <div className={`step-dot ${i < idx ? 'step-dot-done' : i === idx ? 'step-dot-active' : 'step-dot-pending'}`}>
              {i < idx ? <Check size={12} /> : i + 1}
            </div>
            <span style={{ fontSize: 12, color: i <= idx ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{step}</span>
            {i < STEPS.length - 1 && <div className={`step-line ${i < idx ? 'step-line-done' : ''}`} />}
          </div>
        ))}
      </div>
    );
  };

  const renderFeeTable = (fc: EventRow['feeCalculation']) => {
    if (!fc) return <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>暂无费用试算</p>;
    return (
      <div className="table-container" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>项目</th><th>金额(元)</th><th>计算依据</th></tr></thead>
          <tbody>
            {fc.items.map((it, i) => (
              <tr key={i}><td>{it.name}</td><td className="font-mono">{formatMoney(it.amount)}</td><td>{it.calculationBasis}</td></tr>
            ))}
            <tr style={{ fontWeight: 600 }}>
              <td>净额</td>
              <td className="font-mono" style={{ color: fc.netAmount >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>{formatMoney(fc.netAmount)}</td>
              <td>应收 {formatMoney(fc.totalDue)} / 应退 {formatMoney(fc.totalRefund)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderCreateModal = () => showCreate && (
    <div className="modal-overlay animate-fadeIn" onClick={() => { setShowCreate(false); resetForm(); }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>新建事件</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>事件类型</label>
            <select className="select" value={formType} onChange={e => { setFormType(e.target.value); setFormResidentId(''); }}>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>住户</label>
            <select className="select" value={formResidentId} onChange={e => setFormResidentId(e.target.value)}>
              <option value="">请选择住户</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {formType === '转房补差' && <>
            <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>原床位</label>
              <input className="input" value={selectedResident?.bed_label || ''} disabled />
            </div>
            <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>目标床位</label>
              <select className="select" value={formTargetBedId} onChange={e => setFormTargetBedId(e.target.value)}>
                <option value="">请选择空床位</option>
                {emptyBeds.map(b => <option key={b.id} value={b.id}>{b.room_number}-{b.bed_number}</option>)}
              </select>
            </div>
          </>}
          {formType === '护理变更' && <>
            <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>原护理等级</label>
              <input className="input" value={selectedResident?.nursing_level || ''} disabled />
            </div>
            <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>目标护理等级</label>
              <select className="select" value={formTargetNursingLevel} onChange={e => setFormTargetNursingLevel(e.target.value)}>
                <option value="">请选择等级</option>
                {['自理', '半护理', '全护理', '特护'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </>}
          <div><label style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'block' }}>原因</label>
            <input className="input" value={formReason} onChange={e => setFormReason(e.target.value)} placeholder="请输入原因" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={() => { setShowCreate(false); resetForm(); }}>取消</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? '提交中...' : '确认'}</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailModal = () => showDetail && selectedEvent && (
    <div className="modal-overlay animate-fadeIn" onClick={() => setShowDetail(false)}>
      <div className="modal-content" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>事件详情</h3>
          <span className={`badge ${eventTypeBadge(selectedEvent.type)}`}>{selectedEvent.type}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 14 }}>
          <div><span style={{ color: 'var(--color-text-secondary)' }}>住户：</span>{selectedEvent.resident_name}</div>
          <div><span style={{ color: 'var(--color-text-secondary)' }}>状态：</span><span className={`badge ${eventStatusBadge(selectedEvent.status)}`}>{selectedEvent.status}</span></div>
          {selectedEvent.type === '转房补差' && <>
            <div><span style={{ color: 'var(--color-text-secondary)' }}>原床位：</span>{selectedEvent.details.originalBedLabel || selectedEvent.details.originalBedId}</div>
            <div><span style={{ color: 'var(--color-text-secondary)' }}>目标床位：</span>{selectedEvent.details.targetBedLabel || selectedEvent.details.targetBedId}</div>
          </>}
          {selectedEvent.type === '护理变更' && <>
            <div><span style={{ color: 'var(--color-text-secondary)' }}>原等级：</span>{selectedEvent.details.originalNursingLevel}</div>
            <div><span style={{ color: 'var(--color-text-secondary)' }}>目标等级：</span>{selectedEvent.details.targetNursingLevel}</div>
          </>}
          {selectedEvent.type === '短住退押' && selectedEvent.details.daysStaying != null && (
            <div><span style={{ color: 'var(--color-text-secondary)' }}>已住天数：</span>{selectedEvent.details.daysStaying}天</div>
          )}
          <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--color-text-secondary)' }}>原因：</span>{selectedEvent.details.reason}</div>
        </div>
        <div style={{ marginBottom: 16 }}>{renderStepBar(selectedEvent.status)}</div>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Calculator size={16} />费用试算</h4>
          {renderFeeTable(selectedEvent.feeCalculation)}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {selectedEvent.status !== '已完成' && (
            <button className="btn btn-primary" onClick={() => handleAdvance(selectedEvent.id)}>
              <ArrowRight size={14} />推进状态
            </button>
          )}
          {selectedEvent.status === '待确认' && (
            <button className="btn btn-outline" onClick={() => handleGenerate(selectedEvent.id)}>
              <FileText size={14} />生成结算单
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowDetail(false)}>关闭</button>
        </div>
      </div>
    </div>
  );

  const renderSettlementModal = () => showSettlement && settlement && (
    <div className="modal-overlay animate-fadeIn" onClick={() => setShowSettlement(false)}>
      <div className="modal-content" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>结算单</h3>
          <button className="btn btn-outline" onClick={() => window.open(`/api/settlements/${settlement.id}/export`)}>
            <Download size={14} />导出
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 14 }}>
          <div><span style={{ color: 'var(--color-text-secondary)' }}>住户：</span>{settlement.resident_name}</div>
          <div><span style={{ color: 'var(--color-text-secondary)' }}>类型：</span><span className={`badge ${eventTypeBadge(settlement.type)}`}>{settlement.type}</span></div>
          <div><span style={{ color: 'var(--color-text-secondary)' }}>生成时间：</span>{formatDate(settlement.generated_at)}</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>押金快照</h4>
          <pre style={{ background: 'var(--color-surface-warm)', padding: 12, borderRadius: 8, fontSize: 13, overflow: 'auto', border: '1px solid var(--color-border)' }}>
            {JSON.stringify(settlement.depositSnapshot, null, 2)}
          </pre>
        </div>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Calculator size={16} />费用计算</h4>
          {settlement.feeCalculation?.items && (
            <div className="table-container">
              <table>
                <thead><tr><th>项目</th><th>金额(元)</th><th>计算依据</th></tr></thead>
                <tbody>
                  {settlement.feeCalculation.items.map((it: any, i: number) => (
                    <tr key={i}><td>{it.name}</td><td className="font-mono">{formatMoney(it.amount)}</td><td>{it.calculationBasis}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setShowSettlement(false)}>关闭</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>结算中心</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>管理转房补差、短住退押、护理变更等结算事件</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={loadData}><RefreshCw size={16} /></button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} />新建事件</button>
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>加载中...</div>
      ) : events.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>暂无结算事件</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(ev => (
            <div key={ev.id} className="card animate-fadeIn" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                <span className={`badge ${eventTypeBadge(ev.type)}`}>{ev.type}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{ev.resident_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Clock size={12} />{formatDate(ev.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <span>{ev.current_step}</span>
                  {ev.next_step && <><ChevronRight size={14} /><span>{ev.next_step}</span></>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className={`badge ${eventStatusBadge(ev.status)}`}>{ev.status}</span>
                <button className="btn btn-ghost" onClick={() => openDetail(ev)}><Eye size={14} /></button>
                {ev.status === '已完成' && (
                  <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleViewSettlement(ev.id)}>
                    <FileText size={12} />结算单
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {renderCreateModal()}
      {renderDetailModal()}
      {renderSettlementModal()}
    </div>
  );
}
