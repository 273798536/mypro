import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sheetApi } from '../api';
import type { ReviewDashboard as DashboardData, AnomalyPoint, ScatterPoint } from '../types';
import RegressionChart from '../components/RegressionChart';
import AnomalyDetailModal from '../components/AnomalyDetailModal';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  processed: { label: '已处理', cls: 'processed' },
  pending_material: { label: '待补材料', cls: 'pending' },
  manual_overrule: { label: '人工改判', cls: 'manual' },
};

export default function ReviewDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const sheetId = Number(id);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyPoint | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [runLoading, setRunLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!sheetId) return;
    setLoading(true);
    try {
      const d = await sheetApi.dashboard(sheetId);
      setDashboard(d);
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handlePointClick = (point: ScatterPoint) => {
    if (point.is_anomaly && dashboard) {
      const a = dashboard.anomalies.find(x => x.param_row_id === point.param_row_id);
      if (a) setSelectedAnomaly(a);
    }
  };

  const handleRun = async () => {
    if (!sheetId) return;
    try {
      await sheetApi.runRegression(sheetId);
      loadDashboard();
    } catch (err: any) {
      alert(err?.response?.data?.detail || '运行失败');
    }
  };

  const filteredAnomalies = dashboard?.anomalies.filter(a => {
    if (filterStatus === 'all') return a.is_outlier;
    return a.is_outlier && a.review_status === filterStatus;
  }) || [];

  if (loading) {
    return <div className="empty">加载中...</div>;
  }

  if (!dashboard) {
    return <div className="empty">加载失败</div>;
  }

  const { sheet, latest_result, chart, review_summary, change_logs } = dashboard;

  return (
    <div>
      <div className="section-title">
        <h2>
          复核总览 · {sheet.file_name}
          <span style={{ marginLeft: 12 }} className="tag">
            版本 {sheet.version}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleRun}>
            重新运行回归
          </button>
          <Link to={`/sheets/${sheet.id}/rows`} className="btn secondary">
            查看全部明细
          </Link>
          <Link to="/" className="btn secondary">
            返回列表
          </Link>
        </div>
      </div>

      <div className="three-col">
        <div className="stat-box">
          <div className="label">样本总数</div>
          <div className="value">{latest_result?.total_points || 0}</div>
        </div>
        <div className="stat-box">
          <div className="label">异常点数量</div>
          <div className="value" style={{ color: '#ff4757' }}>
            {latest_result?.anomaly_count || 0}
          </div>
        </div>
        <div className="stat-box">
          <div className="label">拟合优度 R²</div>
          <div className="value" style={{ color: '#2ed573' }}>
            {latest_result?.r_squared?.toFixed(4) || '-'}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <h2>分段回归散点图</h2>
            <RegressionChart data={chart} onPointClick={handlePointClick} />
            <div style={{ marginTop: 12, fontSize: 12, color: '#747d8c' }}>
              💡 点击红色异常点可直接下钻到原始材料
            </div>
          </div>

          <div className="card">
            <h2>参数版本 & 变更日志</h2>
            <div style={{ marginBottom: 12 }}>
              <span className="tag">版本: {sheet.version}</span>
              <span className="tag" style={{ marginLeft: 8 }}>
                上传人: {sheet.uploaded_by}
              </span>
              <span className="tag" style={{ marginLeft: 8 }}>
                上传: {new Date(sheet.uploaded_at).toLocaleString()}
              </span>
            </div>
            {sheet.notes && <p style={{ fontSize: 12, color: '#57606f', marginBottom: 12 }}>
              备注: {sheet.notes}
            </p>}

            {change_logs.length === 0 ? (
              <p style={{ fontSize: 12, color: '#a4b0be' }}>暂无修改记录</p>
            ) : (
              <div>
                {change_logs.slice(0, 10).map(log => (
                  <div key={log.id} className="log-item">
                    <div className="log-meta">
                      {log.changed_by} · {new Date(log.changed_at).toLocaleString()}
                      {log.field_name && <span className="tag" style={{ marginLeft: 8 }}>{log.field_name}</span>}
                    </div>
                    <div className="log-content">
                      {log.old_value || '空'} → {log.new_value || '空'}
                      {log.reason && <span style={{ color: '#747d8c', marginLeft: 8 }}>（{log.reason}）</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <h2>复核状态统计</h2>
            <div className="three-col" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 0 }}>
              <div className="stat-box" style={{ textAlign: 'center' }}>
                <div className="label">已处理</div>
                <div className="value" style={{ color: '#0984e3' }}>{review_summary.processed}</div>
              </div>
              <div className="stat-box" style={{ textAlign: 'center' }}>
                <div className="label">待补材料</div>
                <div className="value" style={{ color: '#e17055' }}>{review_summary.pending_material}</div>
              </div>
              <div className="stat-box" style={{ textAlign: 'center' }}>
                <div className="label">人工改判</div>
                <div className="value" style={{ color: '#6c5ce7' }}>{review_summary.manual_overrule}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-title">
              <h2 style={{ marginBottom: 0 }}>异常点列表</h2>
            </div>
            <div className="tabs" style={{ marginBottom: 12 }}>
              <div
                className={`tab ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                全部异常
              </div>
              <div
                className={`tab ${filterStatus === 'pending_material' ? 'active' : ''}`}
                onClick={() => setFilterStatus('pending_material')}
              >
                待补材料
              </div>
              <div
                className={`tab ${filterStatus === 'processed' ? 'active' : ''}`}
                onClick={() => setFilterStatus('processed')}
              >
                已处理
              </div>
              <div
                className={`tab ${filterStatus === 'manual_overrule' ? 'active' : ''}`}
                onClick={() => setFilterStatus('manual_overrule')}
              >
                人工改判
              </div>
            </div>

            {filteredAnomalies.length === 0 ? (
              <div className="empty">暂无符合条件的异常点</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>代码</th>
                    <th>Z值</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnomalies.map(a => (
                    <tr key={a.id}>
                      <td>{a.security_code}</td>
                      <td style={{ color: '#ff4757' }}>{a.z_score?.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${STATUS_LABELS[a.review_status]?.cls || ''}`}>
                          {STATUS_LABELS[a.review_status]?.label || a.review_status}
                        </span>
                      </td>
                      <td>
                        <button className="btn small" onClick={() => setSelectedAnomaly(a)}>
                          查看/复核
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2>字段匹配情况</h2>
            <table>
              <thead>
                <tr>
                  <th>规范字段</th>
                  <th>原始列名</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(sheet.column_mapping || {}).map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>
                      {v ? (
                        <span className="badge ok">{v}</span>
                      ) : (
                        <span className="badge warning">未匹配</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnomalyDetailModal
        anomaly={selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
        onUpdated={() => loadDashboard()}
      />
    </div>
  );
}
