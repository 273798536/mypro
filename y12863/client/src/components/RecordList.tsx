import { useState, useMemo } from 'react';
import { AnchorageRecord, DataStatus, ReviewStatus, statusLabel, reviewLabel } from '../types';

interface Props {
  records: AnchorageRecord[];
  onViewDetail: (id: string) => void;
  onUpdate: () => void;
}

type Filter = 'all' | DataStatus | 'review_pending' | 'review_approved';

export default function RecordList({ records, onViewDetail }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !r.shipName.toLowerCase().includes(s) &&
          !r.anchorageName.toLowerCase().includes(s) &&
          !r.typhoonName.toLowerCase().includes(s) &&
          !r.recordNo.toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      if (filter === 'all') return true;
      if (filter === 'review_pending') return r.reviewStatus === 'pending';
      if (filter === 'review_approved') return r.reviewStatus === 'approved';
      return r.status === filter;
    });
  }, [records, search, filter]);

  const stats = useMemo(() => {
    return {
      total: records.length,
      available: records.filter((r) => r.status === 'available').length,
      pending: records.filter((r) => r.status === 'pending').length,
      recollect: records.filter((r) => r.status === 'recollect').length,
      reviewPending: records.filter((r) => r.reviewStatus === 'pending').length,
      approved: records.filter((r) => r.reviewStatus === 'approved').length,
    };
  }, [records]);

  const getDriftClass = (d: number | null) => {
    if (d === null) return '';
    if (d > 5) return 'high';
    if (d > 1) return 'medium';
    return 'low';
  };

  const filters: { key: Filter; label: string; count: number; type: string }[] = [
    { key: 'all', label: '全部', count: stats.total, type: 'all' },
    { key: 'available', label: '数据可用', count: stats.available, type: 'data' },
    { key: 'pending', label: '数据暂缓', count: stats.pending, type: 'data' },
    { key: 'recollect', label: '需重新采集', count: stats.recollect, type: 'data' },
    { key: 'review_pending', label: '待确认', count: stats.reviewPending, type: 'review' },
    { key: 'review_approved', label: '已通过', count: stats.approved, type: 'review' },
  ];

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">总记录数</div>
          <div className="value">{stats.total}</div>
          <div className="trend">点击详情可倒查来源与处理记录</div>
        </div>
        <div className="stat-card">
          <div className="label">数据可用</div>
          <div className="value success">{stats.available}</div>
          <div className="trend">坐标与计算均正常</div>
        </div>
        <div className="stat-card">
          <div className="label">数据暂缓</div>
          <div className="value warning">{stats.pending}</div>
          <div className="trend">坐标异常或计算失败，需人工确认</div>
        </div>
        <div className="stat-card">
          <div className="label">需重新采集</div>
          <div className="value danger">{stats.recollect}</div>
          <div className="trend">数据质量差，需现场补采</div>
        </div>
      </div>

      <div className="card">
        <h2>
          复核备注
          <span className="badge">日常入口</span>
        </h2>

        <div className="note-box">
          💡 <strong>使用提示：</strong>
          点击记录查看巡检照片、来源文件、计算过程和历史修改。数据状态（可用/暂缓/需重新采集）已自动标记，
          人工修正会完整留痕，待确认改成通过后前后变化可追溯。
        </div>

        <div className="toolbar">
          <input
            type="text"
            className="search-box"
            placeholder="搜索船名 / 锚地名 / 台风名 / 记录编号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filter-group">
            {filters.map((f) => (
              <div
                key={f.key}
                className={`filter-chip ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} ({f.count})
              </div>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>暂无记录，去「数据导入」导入 CSV 或 Excel 文件开始使用</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>记录编号</th>
                <th>船名</th>
                <th>锚地</th>
                <th>台风</th>
                <th>日期</th>
                <th>漂移距离</th>
                <th>数据状态</th>
                <th>复核状态</th>
                <th>照片</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.recordNo}</td>
                  <td className="ship-name">{r.shipName}</td>
                  <td>
                    <span className="anchor-tag">{r.anchorageName}</span>
                  </td>
                  <td>{r.typhoonName}</td>
                  <td>{r.reportDate}</td>
                  <td>
                    {r.driftDistance !== null ? (
                      <span className={`drift-value ${getDriftClass(r.driftDistance)}`}>
                        {r.driftDistance} 海里
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-tag status-${r.status}`}>
                      {statusLabel[r.status]}
                    </span>
                  </td>
                  <td>
                    <span className={`status-tag review-${r.reviewStatus}`}>
                      {reviewLabel[r.reviewStatus]}
                    </span>
                  </td>
                  <td>
                    {r.photos.length > 0 ? (
                      <span style={{ fontWeight: 600, color: '#2563eb' }}>
                        {r.photos.length} 张
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>0</span>
                    )}
                  </td>
                  <td>
                    <a className="action-link" onClick={() => onViewDetail(r.id)}>
                      查看详情
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
