import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function TaskCompare() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [diff, setDiff] = useState(null);
  const [runA, setRunA] = useState('');
  const [runB, setRunB] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await api.getTask(id);
        setTask(t);
        if (t.runs.length >= 2) {
          const a = t.runs[t.runs.length - 2].id;
          const b = t.runs[t.runs.length - 1].id;
          setRunA(String(a));
          setRunB(String(b));
          await doCompare(a, b);
        }
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function doCompare(a, b) {
    try {
      setLoading(true);
      const d = await api.compareRuns(id, a, b);
      setDiff(d);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!task) return <div className="empty">加载中...</div>;
  if (task.runs.length < 2) {
    return (
      <div>
        <Link to={`/tasks/${id}`} className="text-sm" style={{ color: '#3b82f6' }}>← 返回任务详情</Link>
        <div className="card mt-md">
          <div className="empty">至少需要 2 次回放记录才能对比，当前只有 {task.runs.length} 次</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-md">
        <div>
          <Link to={`/tasks/${id}`} className="text-sm" style={{ color: '#3b82f6' }}>← 返回任务详情</Link>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>版本对比分析 - {task.name}</h2>
        </div>
      </div>

      <div className="card mb-md">
        <div className="card-body">
          <div className="flex gap-md items-end">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">前一版回放</label>
              <select className="form-select" value={runA} onChange={e => setRunA(e.target.value)}>
                {task.runs.map(r => (
                  <option key={r.id} value={r.id}>#{r.run_number} - {r.snapshot_file} ({r.anomaly_count}/{r.sample_count})</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 20, color: '#6b7280' }}>→</div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">当前版回放</label>
              <select className="form-select" value={runB} onChange={e => setRunB(e.target.value)}>
                {task.runs.map(r => (
                  <option key={r.id} value={r.id}>#{r.run_number} - {r.snapshot_file} ({r.anomaly_count}/{r.sample_count})</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => doCompare(runA, runB)} disabled={loading}>
              {loading ? '分析中...' : '开始对比'}
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="empty">分析中...</div>}

      {!loading && diff && (
        <div className="flex-col gap-lg" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {diff.alias_warning && (
            <div className="alert alert-warning">
              <strong>⚠ 版本别名问题：</strong> 别名 "{diff.alias_warning.alias_name}" 指向旧文件
              <div style={{ marginTop: 8, paddingLeft: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>处理步骤：</div>
                <ol style={{ fontSize: 13, lineHeight: 1.8, color: '#78350f' }}>
                  {diff.alias_warning.action_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header"><span className="card-title">🔍 影响因素分析（谁影响了结论）</span></div>
            <div className="card-body">
              {diff.influencing_factors.length === 0 ? (
                <div className="text-muted">未检测到明显变化因素</div>
              ) : (
                <div className="flex-col gap-sm" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {diff.influencing_factors.map((f, i) => (
                    <div key={i} style={{ padding: 12, background: '#fafbfc', borderRadius: 6, borderLeft: `4px solid ${f.type === 'alias' ? '#f59e0b' : f.type === 'snapshot' ? '#ef4444' : f.type === 'threshold' ? '#8b5cf6' : f.type === 'judgment' ? '#10b981' : f.type === 'parameters' ? '#3b82f6' : '#6b7280'}` }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{f.factor}</div>
                          <div className="text-sm" style={{ marginTop: 2 }}>{f.detail}</div>
                        </div>
                        <span className={`badge ${f.impact.startsWith('高') ? 'badge-red' : f.impact.startsWith('中') ? 'badge-yellow' : 'badge-blue'}`}>{f.impact.split(' - ')[0]}</span>
                      </div>
                      {f.changes && (
                        <div className="mt-sm" style={{ fontSize: 12, color: '#4b5563' }}>
                          {f.changes.map(c => (
                            <div key={c.param_name} className="diff-row">
                              · {c.param_name}: <span className="diff-removed">{c.previous_value ?? '无'}</span> → <span className="diff-added">{c.current_value ?? '无'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {f.action_steps && (
                        <div className="mt-sm" style={{ fontSize: 12, color: '#92400e', paddingLeft: 8 }}>
                          {f.action_steps.map((s, j) => <div key={j}>→ {s}</div>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="card-header"><span className="card-title">参数变化</span></div>
              <div className="card-body">
                {diff.param_diffs.length === 0 ? <div className="text-muted">参数无变化</div> : (
                  <table>
                    <thead><tr><th>参数名</th><th>前值</th><th>现值</th><th>变化</th></tr></thead>
                    <tbody>
                      {diff.param_diffs.map(p => (
                        <tr key={p.param_name}>
                          <td style={{ fontFamily: 'monospace' }}>{p.param_name}</td>
                          <td className="diff-removed">{p.previous_value ?? '-'}</td>
                          <td className="diff-added">{p.current_value ?? '-'}</td>
                          <td><span className={`badge ${p.change_type === 'added' ? 'badge-green' : p.change_type === 'removed' ? 'badge-red' : 'badge-yellow'}`}>{p.change_type}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">阈值变化</span></div>
              <div className="card-body">
                {!diff.threshold_diff ? <div className="text-muted">阈值无变化</div> : (
                  <div className="metric-card" style={{ maxWidth: 280 }}>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      <span className="diff-removed">{diff.threshold_diff.previous}</span>
                      <span style={{ margin: '0 8px' }}>→</span>
                      <span className="diff-added">{diff.threshold_diff.current}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>
                      变化: <span className={diff.threshold_diff.delta > 0 ? 'diff-added' : 'diff-removed'}>{diff.threshold_diff.delta > 0 ? '+' : ''}{diff.threshold_diff.delta}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">指标变化</span></div>
            <div className="card-body">
              {diff.metric_diffs.length === 0 ? <div className="text-muted">指标无变化</div> : (
                <div className="grid grid-4">
                  {diff.metric_diffs.map(m => (
                    <div key={m.metric_name} className="metric-card">
                      <div className="metric-label">{m.metric_name}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                        <span className="diff-removed">{m.previous_value}</span> → <span className="diff-added">{m.current_value}</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700 }} className={m.delta > 0 ? 'diff-added' : m.delta < 0 ? 'diff-removed' : ''}>
                        {m.delta !== null ? (m.delta > 0 ? '+' : '') + m.delta : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">样本变化</span></div>
            <div className="card-body">
              <div className="grid grid-2">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                    样本集合（新增 {diff.sample_diffs.added_samples.length}，减少 {diff.sample_diffs.removed_samples.length}）
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {diff.sample_diffs.added_samples.length > 0 && (
                      <div className="mb-sm"><span className="diff-added">新增：</span>{diff.sample_diffs.added_samples.join(', ')}</div>
                    )}
                    {diff.sample_diffs.removed_samples.length > 0 && (
                      <div><span className="diff-removed">移除：</span>{diff.sample_diffs.removed_samples.join(', ')}</div>
                    )}
                    {diff.sample_diffs.added_samples.length === 0 && diff.sample_diffs.removed_samples.length === 0 && (
                      <span className="text-muted">无变化</span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                    异常集合（新增 {diff.sample_diffs.added_anomalies.length}，减少 {diff.sample_diffs.removed_anomalies.length}）
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {diff.sample_diffs.added_anomalies.length > 0 && (
                      <div className="mb-sm"><span className="diff-added">新增异常：</span>{diff.sample_diffs.added_anomalies.join(', ')}</div>
                    )}
                    {diff.sample_diffs.removed_anomalies.length > 0 && (
                      <div><span className="diff-removed">减少异常：</span>{diff.sample_diffs.removed_anomalies.join(', ')}</div>
                    )}
                    {diff.sample_diffs.added_anomalies.length === 0 && diff.sample_diffs.removed_anomalies.length === 0 && (
                      <span className="text-muted">无变化</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="card-header"><span className="card-title">人工改判变化</span></div>
              <div className="card-body">
                {diff.judgment_diffs.length === 0 ? <div className="text-muted">无人工改判变化</div> : (
                  <table>
                    <thead><tr><th>样本ID</th><th>变化</th><th>详情</th></tr></thead>
                    <tbody>
                      {diff.judgment_diffs.map(j => (
                        <tr key={j.sample_id}>
                          <td style={{ fontFamily: 'monospace' }}>{j.sample_id}</td>
                          <td><span className={`badge ${j.change === 'added' ? 'badge-green' : j.change === 'removed' ? 'badge-red' : 'badge-yellow'}`}>{j.change}</span></td>
                          <td className="text-sm">
                            {j.change === 'added' && `→ ${j.new_label}${j.reason ? ' (' + j.reason + ')' : ''}`}
                            {j.change === 'removed' && `原: ${j.previous_label}`}
                            {j.change === 'modified' && `${j.previous_label} → ${j.new_label}${j.reason ? ' (' + j.reason + ')' : ''}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">备注变化</span></div>
              <div className="card-body">
                {diff.note_diffs.map((n, i) => (
                  <div key={i}>
                    备注数量：前一版 {n.run_a_count} 条 → 当前版 {n.run_b_count} 条
                    {n.delta !== 0 && (
                      <span className={`badge ${n.delta > 0 ? 'badge-green' : 'badge-red'}`} style={{ marginLeft: 8 }}>
                        {n.delta > 0 ? '+' : ''}{n.delta}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
