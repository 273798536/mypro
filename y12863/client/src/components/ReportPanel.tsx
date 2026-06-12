import { useState, useMemo } from 'react';
import { AnchorageRecord } from '../types';
import { api } from '../api';

interface Props {
  records: AnchorageRecord[];
}

export default function ReportPanel({ records }: Props) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);

  const monthRecords = useMemo(() => {
    return records.filter((r) => r.reportDate.startsWith(month));
  }, [records, month]);

  const stats = useMemo(() => {
    const list = monthRecords;
    const drifts = list.map((r) => r.driftDistance).filter((d): d is number => d !== null);
    return {
      total: list.length,
      available: list.filter((r) => r.status === 'available').length,
      pending: list.filter((r) => r.status === 'pending').length,
      recollect: list.filter((r) => r.status === 'recollect').length,
      approved: list.filter((r) => r.reviewStatus === 'approved').length,
      reviewPending: list.filter((r) => r.reviewStatus === 'pending').length,
      avgDrift: drifts.length ? (drifts.reduce((a, b) => a + b, 0) / drifts.length).toFixed(3) : null,
      maxDrift: drifts.length ? Math.max(...drifts).toFixed(3) : null,
    };
  }, [monthRecords]);

  const handleExport = () => {
    const url = api.getMonthlyCsvUrl(month);
    const a = document.createElement('a');
    a.href = url;
    a.download = `台风避风锚地月报_${month}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="card">
        <h2>
          月报导出
          <span className="badge">月底 / 课前</span>
        </h2>

        <div className="note-box">
          📊 <strong>月报说明：</strong>
          月报会包含当月所有记录的汇总统计，以及每条记录的详细数据、漂移计算说明、数据状态和复核状态。
          导出 CSV 可用 Excel 打开，可直接用于风险通报或上报材料。
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>选择月份</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleExport}>
              📥 导出 CSV 月报
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>
          当月概览 · {month}
          <span className="badge">{stats.total} 条记录</span>
        </h2>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">总记录数</div>
            <div className="value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="label">数据可用</div>
            <div className="value success">{stats.available}</div>
            <div className="trend">占比 {stats.total ? ((stats.available / stats.total) * 100).toFixed(1) : 0}%</div>
          </div>
          <div className="stat-card">
            <div className="label">数据暂缓</div>
            <div className="value warning">{stats.pending}</div>
            <div className="trend">需人工确认</div>
          </div>
          <div className="stat-card">
            <div className="label">需重新采集</div>
            <div className="value danger">{stats.recollect}</div>
            <div className="trend">数据质量不合格</div>
          </div>
          <div className="stat-card">
            <div className="label">复核通过</div>
            <div className="value success">{stats.approved}</div>
          </div>
          <div className="stat-card">
            <div className="label">待确认</div>
            <div className="value warning">{stats.reviewPending}</div>
          </div>
          <div className="stat-card">
            <div className="label">平均漂移</div>
            <div className="value">{stats.avgDrift ?? '—'}</div>
            <div className="trend">单位：海里</div>
          </div>
          <div className="stat-card">
            <div className="label">最大漂移</div>
            <div className="value" style={{ color: '#dc2626' }}>{stats.maxDrift ?? '—'}</div>
            <div className="trend">单位：海里</div>
          </div>
        </div>

        <div className="section-title">结果说明</div>
        <div className="drift-note" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#075985' }}>
          【数据可用】{stats.available} 条：坐标完整、漂移计算正常、在合理范围内，可直接用于台风避风锚地推荐结论。{'\n'}
          【数据暂缓】{stats.pending} 条：坐标异常或计算失败，需人工复核确认后再使用，暂不纳入推荐结论。{'\n'}
          【需重新采集】{stats.recollect} 条：数据质量存在明显问题（如坐标为 0、偏移过大超出合理范围等），需现场重新巡检采集。
        </div>
      </div>
    </div>
  );
}
