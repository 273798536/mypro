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

interface RunErrorInfo {
  detail: string;
  error_type?: string;
  details?: Record<string, any>;
}

export default function ReviewDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const sheetId = Number(id);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyPoint | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<RunErrorInfo | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!sheetId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const d = await sheetApi.dashboard(sheetId);
      setDashboard(d);
    } catch (err: any) {
      setLoadError(err?.response?.data?.detail || err?.message || '加载复核数据失败');
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
    if (!sheetId || runLoading) return;
    setRunLoading(true);
    setRunError(null);
    try {
      await sheetApi.runRegression(sheetId);
      await loadDashboard();
    } catch (err: any) {
      const resp = err?.response?.data || {};
      setRunError({
        detail: resp.detail || err?.message || '运行回归失败',
        error_type: resp.error_type,
        details: resp.details,
      });
    } finally {
      setRunLoading(false);
    }
  };

  const anomalyTabs = [
    { key: 'all', label: '全部异常' },
    { key: 'pending_material', label: '待补材料' },
    { key: 'processed', label: '已处理' },
    { key: 'manual_overrule', label: '人工改判' },
  ];

  const filteredAnomalies = dashboard?.anomalies.filter(a => {
    if (filterStatus === 'all') return a.is_outlier;
    return a.is_outlier && a.review_status === filterStatus;
  }) || [];

  const filterCounts: Record<string, number> = { all: 0 };
  if (dashboard) {
    filterCounts.all = dashboard.anomalies.filter(a => a.is_outlier).length;
    ['pending_material', 'processed', 'manual_overrule'].forEach(s => {
      filterCounts[s] = dashboard.anomalies.filter(a => a.is_outlier && a.review_status === s).length;
    });
  }

  if (loading) {
    return <div className="empty">加载中...</div>;
  }

  if (!dashboard) {
    return (
      <div className="card">
        <h2>复核数据加载失败</h2>
        <p className="warning-text">{loadError || '未知错误'}</p>
        <div style={{ marginTop: 16 }}>
          <button className="btn" onClick={loadDashboard}>重新加载</button>
          <Link to="/" style={{ marginLeft: 8 }} className="btn secondary">返回列表</Link>
        </div>
      </div>
    );
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
          <button
            className="btn secondary"
            onClick={handleRun}
            disabled={runLoading || loading}
          >
            {runLoading ? '运行中...' : '重新运行回归'}
          </button>
          <Link to={`/sheets/${sheet.id}/rows`} className="btn secondary">
            查看全部明细
          </Link>
          <Link to="/" className="btn secondary">
            返回列表
          </Link>
        </div>
      </div>

      {runError && (
        <div className="card" style={{ borderLeft: '4px solid #ff4757' }}>
          <h2 style={{ color: '#ff4757' }}>
            {runError.error_type === 'bad_material' ? '坏材料，无法运行回归' : '运行回归失败'}
          </h2>
          <p style={{ marginBottom: 8 }}>{runError.detail}</p>
          {runError.details && Object.keys(runError.details).length > 0 && (
            <div className="raw-data-grid">
              {Object.entries(runError.details).map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <div className="key">{k}</div>
                  <div>
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {runError.error_type === 'bad_material' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Link to={`/sheets/${sheet.id}/rows?issues=1`} className="btn small warn">
                去明细页筛有问题的行
              </Link>
              <button className="btn small secondary" onClick={() => setRunError(null)}>
                关闭提示
              </button>
            </div>
          )}
        </div>
      )}

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
              {anomalyTabs.map(tab => (
                <div
                  key={tab.key}
                  className={`tab ${filterStatus === tab.key ? 'active' : ''}`}
                  onClick={() => setFilterStatus(tab.key)}
                  style={{ cursor: 'pointer' }}
                >
                  {tab.label}
                  <span
                    style={{
                      marginLeft: 6,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: filterStatus === tab.key ? '#3742fa' : '#dfe4ea',
                      color: filterStatus === tab.key ? '#fff' : '#57606f',
                      fontSize: 11,
                    }}
                  >
                    {filterCounts[tab.key] || 0}
                  </span>
                </div>
              ))}
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
