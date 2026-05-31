import { useState, useEffect, useCallback } from 'react';
import { Wallet, Search, TrendingUp, Clock, Eye, Plus, ArrowRight, Check, Receipt } from 'lucide-react';
import { fetchApi, formatMoney, formatDate, depositStatusBadge, txTypeBadge } from '@/utils/api';

interface DepositRow {
  id: string; resident_id: string; resident_name: string; bed_label: string;
  total_amount: number; current_balance: number; status: string;
  created_at: string; updated_at: string;
}
interface DepositTransaction {
  id: string; deposit_id: string; type: string; amount: number;
  reason: string; trigger_source: string; trigger_event_id?: string; created_at: string;
}
interface DepositDetail extends DepositRow {
  transactions: DepositTransaction[];
}

const STATUS_STEPS = ['待收', '已收', '待复核', '已结'];

export default function DepositPage() {
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DepositDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<DepositRow[]>('/deposits');
      setDeposits(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDeposits(); }, [loadDeposits]);

  const openDetail = async (id: string) => {
    const data = await fetchApi<DepositDetail>(`/deposits/${id}`);
    setDetail(data);
  };

  const filtered = deposits.filter(d =>
    d.resident_name.includes(keyword) || d.bed_label.includes(keyword)
  );

  const totalAmount = deposits.reduce((s, d) => s + d.total_amount, 0);
  const activeCount = deposits.filter(d => d.status === '已收').length;
  const pendingCount = deposits.filter(d => d.status === '待收' || d.status === '待复核').length;

  const getStepIndex = (status: string) => STATUS_STEPS.indexOf(status);

  const renderStepBar = (status: string) => {
    const current = getStepIndex(status);
    return (
      <div className="step-bar">
        {STATUS_STEPS.map((step, i) => (
          <div key={step} className="step-item">
            <div className={`step-dot ${i < current ? 'step-dot-done' : i === current ? 'step-dot-active' : 'step-dot-pending'}`}>
              {i < current ? <Check size={12} /> : i + 1}
            </div>
            <span style={{ fontSize: 12, color: i <= current ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{step}</span>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`step-line ${i < current ? 'step-line-done' : ''}`} />
                <ArrowRight size={12} style={{ color: i < current ? 'var(--color-success)' : 'var(--color-text-muted)', marginLeft: 2 }} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>押金账本</h2>
        <button className="btn btn-primary"><Plus size={16} />新增押金</button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div className="card animate-fadeIn" style={{ flex: 1, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Wallet size={18} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>押金总额</span>
          </div>
          <div className="font-mono" style={{ fontSize: 24, fontWeight: 700 }}>¥{formatMoney(totalAmount)}</div>
        </div>
        <div className="card animate-fadeIn" style={{ flex: 1, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>在住人数</span>
          </div>
          <div className="font-mono" style={{ fontSize: 24, fontWeight: 700 }}>{activeCount}</div>
        </div>
        <div className="card animate-fadeIn" style={{ flex: 1, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Clock size={18} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>待处理项</span>
          </div>
          <div className="font-mono" style={{ fontSize: 24, fontWeight: 700 }}>{pendingCount}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input className="input" placeholder="搜索住民姓名或房间号..." value={keyword} onChange={e => setKeyword(e.target.value)} style={{ maxWidth: 320 }} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>住民姓名</th>
              <th>床位</th>
              <th>押金总额</th>
              <th>当前余额</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 500 }}>{d.resident_name}</td>
                <td>{d.bed_label}</td>
                <td className="font-mono">¥{formatMoney(d.total_amount)}</td>
                <td className="font-mono">¥{formatMoney(d.current_balance)}</td>
                <td><span className={`badge ${depositStatusBadge(d.status)}`}>{d.status}</span></td>
                <td>
                  <button className="btn btn-ghost" onClick={() => openDetail(d.id)}>
                    <Eye size={14} />详情
                  </button>
                </td>
              </tr>
            ))}
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>暂无数据</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-content animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>押金详情</h3>
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>住民姓名</div>
                <div style={{ fontWeight: 500 }}>{detail.resident_name}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>床位</div>
                <div>{detail.bed_label}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>押金总额</div>
                <div className="font-mono">¥{formatMoney(detail.total_amount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>当前余额</div>
                <div className="font-mono">¥{formatMoney(detail.current_balance)}</div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>状态进度</div>
              {renderStepBar(detail.status)}
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Receipt size={14} />交易记录
              </div>
              {detail.transactions.map((tx, i) => (
                <div key={tx.id} className="timeline-item">
                  <div className={`timeline-dot ${i === 0 ? 'timeline-dot-active' : ''}`} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${txTypeBadge(tx.type)}`}>{tx.type}</span>
                      <span style={{ fontSize: 13 }}>{tx.reason}</span>
                    </div>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>¥{formatMoney(tx.amount)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {formatDate(tx.created_at)} · {tx.trigger_source}
                  </div>
                </div>
              ))}
              {detail.transactions.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 16, fontSize: 13 }}>暂无交易记录</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
