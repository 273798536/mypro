import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [showRunForm, setShowRunForm] = useState(false);
  const [runForm, setRunForm] = useState({ threshold: 0.85, snapshot_file: '', topk: 100, ef_search: 128 });
  const [noteForm, setNoteForm] = useState({ content: '', note_type: 'written' });
  const [judgmentForm, setJudgmentForm] = useState({ sample_id: '', original_label: 'normal', new_label: 'anomaly', reason: '' });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadTask();
    loadSnapshots();
  }, [id]);

  async function loadTask() {
    const data = await api.getTask(id);
    setTask(data);
    if (!runForm.snapshot_file) {
      const snaps = await api.listSnapshots();
      if (snaps.snapshots?.[0]) {
        setRunForm(f => ({ ...f, snapshot_file: snaps.snapshots[0].filename }));
      }
    }
  }

  async function loadSnapshots() {
    const data = await api.listSnapshots();
    setSnapshots(data.snapshots || []);
  }

  async function handleRun(e) {
    e.preventDefault();
    try {
      const parameters = { topk: runForm.topk, ef_search: runForm.ef_search };
      await api.createRun(id, {
        threshold: parseFloat(runForm.threshold),
        snapshot_file: runForm.snapshot_file,
        parameters,
      });
      setShowRunForm(false);
      loadTask();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleNote(e) {
    e.preventDefault();
    if (!noteForm.content.trim()) return;
    await api.addNote(id, noteForm);
    setNoteForm({ content: '', note_type: 'written' });
    loadTask();
  }

  async function handleJudgment(e) {
    e.preventDefault();
    if (!judgmentForm.sample_id.trim()) return alert('请输入样本ID');
    await api.addJudgment(id, judgmentForm);
    setJudgmentForm({ sample_id: '', original_label: 'normal', new_label: 'anomaly', reason: '' });
    loadTask();
  }

  async function handleExport(format) {
    try {
      const res = await api.exportTask(id, format);
      alert(`导出成功！\n文件路径: ${res.filepath}`);
    } catch (e) {
      alert(e.message);
    }
  }

  if (!task) return <div className="empty">加载中...</div>;

  const latestRun = task.runs.length > 0 ? task.runs[task.runs.length - 1] : null;

  return (
    <div>
      <div className="flex justify-between items-start mb-md">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{task.name}</h2>
          <div className="flex gap-sm mt-sm items-center wrap">
            <span className={`badge ${task.status === 'completed' ? 'badge-green' : task.status === 'running' ? 'badge-blue' : 'badge-gray'}`}>
              {task.status === 'pending' ? '待启动' : task.status === 'running' ? '进行中' : '已完成'}
            </span>
            {task.snapshot_version && <span className="tag-chip">版本 {task.snapshot_version}</span>}
            {task.snapshot_alias && (
              task.snapshot_alias_points_old
                ? <span className="badge badge-yellow">⚠ 别名 {task.snapshot_alias} 指向旧文件</span>
                : <span className="badge badge-blue">别名 {task.snapshot_alias}</span>
            )}
          </div>
          <p className="text-sm mt-sm" style={{ marginTop: 8 }}>{task.current_status}</p>
        </div>
        <div className="flex gap-sm">
          <Link to={`/tasks/${id}/compare`} className="btn">版本对比</Link>
          <Link to={`/tasks/${id}/handover`} className="btn">交班卡片</Link>
          <button className="btn" onClick={() => handleExport('json')}>导出JSON</button>
          <button className="btn" onClick={() => handleExport('csv')}>导出CSV</button>
          <button className="btn btn-primary" onClick={() => setShowRunForm(true)}>+ 新建回放</button>
        </div>
      </div>

      {task.snapshot_alias_points_old && (
        <div className="alert alert-warning">
          <strong>⚠ 版本别名警告：</strong> 别名 "{task.snapshot_alias}" 当前指向旧版快照文件。
          <br />请确认：① 若需使用旧版继续回放，在备注中注明原因；② 若需新版，请切换到最新快照文件。
        </div>
      )}

      {showRunForm && (
        <div className="card mb-md">
          <div className="card-header">
            <span className="card-title">新建回放 - 第{(task.runs.length + 1)}次</span>
            <button className="btn btn-sm" onClick={() => setShowRunForm(false)}>取消</button>
          </div>
          <div className="card-body">
            <form onSubmit={handleRun} className="grid grid-2">
              <div className="form-group">
                <label className="form-label">特征快照文件</label>
                <select className="form-select" value={runForm.snapshot_file}
                  onChange={e => setRunForm({ ...runForm, snapshot_file: e.target.value })}>
                  {snapshots.map(s => (
                    <option key={s.filename} value={s.filename}>
                      {s.filename} (v{s.version}, {s.sample_count}样本{s.is_latest ? ', 最新' : ''})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">异常阈值 (0-1)</label>
                <input className="form-input" type="number" step="0.01" min="0" max="1"
                  value={runForm.threshold}
                  onChange={e => setRunForm({ ...runForm, threshold: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">topk 参数</label>
                <input className="form-input" type="number" value={runForm.topk}
                  onChange={e => setRunForm({ ...runForm, topk: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">ef_search 参数</label>
                <input className="form-input" type="number" value={runForm.ef_search}
                  onChange={e => setRunForm({ ...runForm, ef_search: e.target.value })} />
              </div>
              <div className="form-group grid-2 flex items-end justify-end" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn btn-primary">执行回放</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-4 mb-md">
        <div className="metric-card">
          <div className="metric-label">回放次数</div>
          <div className="metric-value">{task.runs.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">最新样本数</div>
          <div className="metric-value">{latestRun?.sample_count || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">最新异常数</div>
          <div className="metric-value text-danger">{latestRun?.anomaly_count || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">最新 F1</div>
          <div className="metric-value">{latestRun?.metrics?.f1 ?? '-'}</div>
        </div>
      </div>

      <div className="card mb-md">
        <div className="flex" style={{ borderBottom: '1px solid #f3f4f6' }}>
          {['overview', 'runs', 'anomalies', 'parameters', 'judgments', 'notes'].map(tab => (
            <button key={tab}
              className={`btn btn-sm`}
              style={{
                border: 'none',
                borderRadius: 0,
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                background: 'transparent',
                fontWeight: activeTab === tab ? 600 : 400,
              }}
              onClick={() => setActiveTab(tab)}>
              {{
                overview: '页面摘要',
                runs: '回放历史',
                anomalies: '异常样本',
                parameters: '参数变化',
                judgments: '人工改判',
                notes: '备注记录',
              }[tab]}
            </button>
          ))}
        </div>
        <div className="card-body">
          {activeTab === 'overview' && (
            <div>
              <p style={{ fontSize: 14, lineHeight: 1.8 }}>{task.page_summary}</p>
              <div className="mt-md">
                <strong style={{ fontSize: 13 }}>当前状态：</strong> {task.current_status}
              </div>
              <div className="mt-md text-sm">
                任务创建于 {new Date(task.created_at).toLocaleString('zh-CN')}，
                最后更新 {new Date(task.updated_at).toLocaleString('zh-CN')}
              </div>
            </div>
          )}

          {activeTab === 'runs' && (
            task.runs.length === 0 ? <div className="empty">暂无回放记录</div> : (
              <table>
                <thead>
                  <tr>
                    <th>次数</th>
                    <th>状态</th>
                    <th>阈值</th>
                    <th>快照文件</th>
                    <th>样本/异常</th>
                    <th>F1 / 精确率 / 召回率</th>
                    <th>完成时间</th>
                  </tr>
                </thead>
                <tbody>
                  {task.runs.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>#{r.run_number}</td>
                      <td><span className={`badge ${r.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>{r.status}</span></td>
                      <td>{r.threshold}</td>
                      <td className="text-sm">{r.snapshot_file}</td>
                      <td>{r.sample_count} / <span className="text-danger">{r.anomaly_count}</span></td>
                      <td className="text-sm">
                        {r.metrics.f1} / {r.metrics.precision} / {r.metrics.recall}
                      </td>
                      <td className="text-sm">{r.finished_at ? new Date(r.finished_at).toLocaleString('zh-CN') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'anomalies' && (
            !latestRun ? <div className="empty">请先执行回放</div> : (
              <div>
                <div className="mb-sm" style={{ fontSize: 13, color: '#6b7280' }}>
                  最新回放 (#{latestRun.run_number}) 共检测出 {latestRun.anomaly_ids.length} 个异常样本：
                </div>
                <div className="flex wrap gap-sm">
                  {latestRun.anomaly_ids.map(sid => (
                    <span key={sid} className="badge badge-red" style={{ padding: '4px 10px' }}>{sid}</span>
                  ))}
                </div>
              </div>
            )
          )}

          {activeTab === 'parameters' && (
            task.runs.length === 0 ? <div className="empty">请先执行回放</div> : (
              <div className="flex-col gap-md" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {task.runs.map(r => (
                  <div key={r.id} style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>回放 #{r.run_number}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span className="tag-chip">阈值: {r.threshold}</span>
                      {r.parameters.map(p => (
                        <span key={p.id} className={`tag-chip ${p.changed_from_previous ? 'diff-added' : ''}`}
                          style={p.changed_from_previous ? { background: '#dcfce7', color: '#166534' } : {}}>
                          {p.param_name}: {p.param_value}
                          {p.changed_from_previous && ` (之前: ${p.previous_value})`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'judgments' && (
            <div>
              <form onSubmit={handleJudgment} className="grid grid-4 mb-md gap-sm" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto' }}>
                <input className="form-input" placeholder="样本ID 如 s0012"
                  value={judgmentForm.sample_id}
                  onChange={e => setJudgmentForm({ ...judgmentForm, sample_id: e.target.value })} />
                <select className="form-select" value={judgmentForm.original_label}
                  onChange={e => setJudgmentForm({ ...judgmentForm, original_label: e.target.value })}>
                  <option value="normal">原: normal</option>
                  <option value="anomaly">原: anomaly</option>
                </select>
                <select className="form-select" value={judgmentForm.new_label}
                  onChange={e => setJudgmentForm({ ...judgmentForm, new_label: e.target.value })}>
                  <option value="anomaly">改: anomaly</option>
                  <option value="normal">改: normal</option>
                </select>
                <input className="form-input" placeholder="改判理由"
                  value={judgmentForm.reason}
                  onChange={e => setJudgmentForm({ ...judgmentForm, reason: e.target.value })} />
                <button className="btn btn-primary btn-sm">+ 改判</button>
              </form>
              {task.judgments.length === 0 ? (
                <div className="empty">暂无人工改判记录</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>样本ID</th><th>原标签</th><th>改后标签</th><th>理由</th><th>操作人</th><th>时间</th></tr>
                  </thead>
                  <tbody>
                    {task.judgments.map(j => (
                      <tr key={j.id}>
                        <td style={{ fontFamily: 'monospace' }}>{j.sample_id}</td>
                        <td><span className="badge badge-gray">{j.original_label}</span></td>
                        <td><span className={`badge ${j.new_label === 'anomaly' ? 'badge-red' : 'badge-green'}`}>{j.new_label}</span></td>
                        <td className="text-sm">{j.reason || '-'}</td>
                        <td className="text-sm">{j.created_by}</td>
                        <td className="text-sm">{new Date(j.created_at).toLocaleString('zh-CN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <form onSubmit={handleNote} className="mb-md" style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder="添加备注或口头记录..."
                  value={noteForm.content}
                  onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} />
                <select className="form-select" style={{ width: 120 }} value={noteForm.note_type}
                  onChange={e => setNoteForm({ ...noteForm, note_type: e.target.value })}>
                  <option value="written">文字备注</option>
                  <option value="verbal">口头备注</option>
                </select>
                <button className="btn btn-primary">+ 添加</button>
              </form>
              {task.notes.length === 0 ? (
                <div className="empty">暂无备注记录</div>
              ) : (
                <ul className="list">
                  {task.notes.map(n => (
                    <li key={n.id} className="list-item">
                      <span className={`badge ${n.note_type === 'verbal' ? 'badge-yellow' : 'badge-blue'}`}>
                        {n.note_type === 'verbal' ? '口头' : '文字'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14 }}>{n.content}</div>
                        <div className="text-sm mt-sm">
                          {n.created_by} · {new Date(n.created_at).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
