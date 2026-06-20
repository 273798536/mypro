import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function HandoverCard() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [task, setTask] = useState(null);

  useEffect(() => {
    (async () => {
      const [s, t] = await Promise.all([api.getTaskSummary(id), api.getTask(id)]);
      setSummary(s);
      setTask(t);
    })();
  }, [id]);

  if (!summary || !task) return <div className="empty">加载中...</div>;

  return (
    <div>
      <Link to={`/tasks/${id}`} className="text-sm" style={{ color: '#3b82f6' }}>← 返回任务详情</Link>

      <div className="mt-md handover-card">
        <div className="handover-title">交班信息卡</div>
        <div className="handover-sub">
          {task.name} · 更新于 {new Date(summary.last_updated).toLocaleString('zh-CN')}
        </div>

        <div className="handover-item">
          <div className="handover-icon">📦</div>
          <div style={{ flex: 1 }}>
            <div className="handover-label">样例在哪</div>
            <div className="handover-value">{summary.sample_location}</div>
            <div className="text-sm" style={{ marginTop: 4 }}>
              共 {summary.total_samples} 个样本
              {summary.latest_run_id && <span className="tag-chip" style={{ marginLeft: 8 }}>回放 #{summary.latest_run_id}</span>}
            </div>
          </div>
        </div>

        <div className="handover-item">
          <div className="handover-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>🚨</div>
          <div style={{ flex: 1 }}>
            <div className="handover-label">异常在哪</div>
            <div className="handover-value">{summary.anomaly_location}</div>
            <div className="text-sm" style={{ marginTop: 4 }}>
              当前共 <span style={{ color: '#dc2626', fontWeight: 600 }}>{summary.anomaly_count}</span> 个异常
            </div>
          </div>
        </div>

        <div className="handover-item">
          <div className="handover-icon" style={{ background: '#ecfdf5', color: '#059669' }}>📤</div>
          <div style={{ flex: 1 }}>
            <div className="handover-label">结果怎么导出</div>
            <div className="handover-value">{summary.export_method}</div>
          </div>
        </div>

        {task.snapshot_alias_points_old && (
          <div className="handover-item">
            <div className="handover-icon" style={{ background: '#fffbeb', color: '#d97706' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div className="handover-label">需要注意</div>
              <div className="handover-value" style={{ color: '#92400e' }}>
                版本别名 "{task.snapshot_alias}" 指向旧文件，接班后请确认版本选择
              </div>
            </div>
          </div>
        )}

        {task.judgments.length > 0 && (
          <div className="handover-item">
            <div className="handover-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>✏️</div>
            <div style={{ flex: 1 }}>
              <div className="handover-label">人工改判</div>
              <div className="handover-value">共 {task.judgments.length} 条，请复核改判理由</div>
            </div>
          </div>
        )}

        {task.notes.length > 0 && (
          <div className="handover-item">
            <div className="handover-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>📝</div>
            <div style={{ flex: 1 }}>
              <div className="handover-label">备注</div>
              <div className="handover-value">{task.notes.length} 条备注（含口头备注）</div>
              <ul className="text-sm mt-sm" style={{ listStyle: 'none', padding: 0 }}>
                {task.notes.slice(0, 3).map(n => (
                  <li key={n.id} style={{ padding: '4px 0', color: '#4b5563' }}>
                    [{n.note_type === 'verbal' ? '口头' : '文字'}] {n.content}
                  </li>
                ))}
                {task.notes.length > 3 && <li style={{ color: '#6b7280' }}>...还有 {task.notes.length - 3} 条</li>}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨 打印交班卡</button>
      </div>
    </div>
  );
}
