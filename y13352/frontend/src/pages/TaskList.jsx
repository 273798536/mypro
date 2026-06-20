import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', snapshot_version: '', snapshot_alias: '' });
  const navigate = useNavigate();

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    try {
      const data = await api.listTasks();
      setTasks(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return alert('请输入任务名称');
    try {
      const task = await api.createTask(form);
      setShowCreate(false);
      setForm({ name: '', snapshot_version: '', snapshot_alias: '' });
      navigate(`/tasks/${task.id}`);
    } catch (e) {
      alert(e.message);
    }
  }

  function statusBadge(s) {
    const map = {
      pending: ['待启动', 'badge-gray'],
      running: ['进行中', 'badge-blue'],
      completed: ['已完成', 'badge-green'],
    };
    const [text, cls] = map[s] || [s, 'badge-gray'];
    return <span className={`badge ${cls}`}>{text}</span>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-md">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>值班概览</h2>
          <p className="text-sm mt-sm">管理所有向量索引异常回放任务</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ 新建任务</button>
      </div>

      {showCreate && (
        <div className="card mb-md">
          <div className="card-header">
            <span className="card-title">新建回放任务</span>
            <button className="btn btn-sm" onClick={() => setShowCreate(false)}>取消</button>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreate} className="grid grid-2">
              <div className="form-group">
                <label className="form-label">任务名称 *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="例：2025-06-20 生产环境异常复核" />
              </div>
              <div className="form-group">
                <label className="form-label">快照版本</label>
                <input className="form-input" value={form.snapshot_version}
                  onChange={e => setForm({ ...form, snapshot_version: e.target.value })}
                  placeholder="例：v2025.06.20" />
              </div>
              <div className="form-group">
                <label className="form-label">版本别名</label>
                <input className="form-input" value={form.snapshot_alias}
                  onChange={e => setForm({ ...form, snapshot_alias: e.target.value })}
                  placeholder="例：daily_prod（用于检测是否指向旧文件）" />
              </div>
              <div className="form-group flex items-end justify-end">
                <button type="submit" className="btn btn-primary">创建任务</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="empty">暂无任务，点击右上角 "新建任务" 开始</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>任务</th>
                <th>状态</th>
                <th>回放次数</th>
                <th>当前异常</th>
                <th>快照别名</th>
                <th>更新时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      <Link to={`/tasks/${t.id}`} style={{ color: '#2563eb' }}>{t.name}</Link>
                    </div>
                    <div className="text-sm">{t.current_status}</div>
                  </td>
                  <td>{statusBadge(t.status)}</td>
                  <td>{t.runs.length} 次</td>
                  <td>
                    {t.runs.length > 0
                      ? <span className="badge badge-red">{t.runs[t.runs.length - 1].anomaly_count} / {t.runs[t.runs.length - 1].sample_count}</span>
                      : '-'}
                  </td>
                  <td>
                    {t.snapshot_alias ? (
                      t.snapshot_alias_points_old
                        ? <span className="badge badge-yellow" title="别名指向旧文件">⚠ {t.snapshot_alias}</span>
                        : <span className="badge badge-blue">{t.snapshot_alias}</span>
                    ) : '-'}
                  </td>
                  <td className="text-sm">{new Date(t.updated_at).toLocaleString('zh-CN')}</td>
                  <td>
                    <Link to={`/tasks/${t.id}`} className="btn btn-sm">详情</Link>
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
