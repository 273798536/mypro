import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBatchSummary, getBatchSamples, runRegression, exportBatch, correctSample, getSampleHistory } from '../api.js';

const sampleTypeLabels = {
  normal: { text: '正常样本', className: 'badge-normal' },
  boundary: { text: '边界样本', className: 'badge-boundary' },
  bad: { text: '明显坏样本', className: 'badge-bad' }
};

const resultLabels = {
  pass: { text: '通过', className: 'badge-pass' },
  block: { text: '拦截', className: 'badge-block' }
};

export default function BatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [samples, setSamples] = useState([]);
  const [filter, setFilter] = useState({ sample_type: '', final_result: '' });
  const [loading, setLoading] = useState(true);
  const [correctModal, setCorrectModal] = useState(null);
  const [correctForm, setCorrectForm] = useState({ new_result: '', reason: '' });
  const [historyModal, setHistoryModal] = useState(null);
  const [history, setHistory] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, samplesRes] = await Promise.all([
        getBatchSummary(batchId),
        getBatchSamples(batchId, filter)
      ]);
      setSummary(sumRes.data);
      setSamples(samplesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [batchId, filter]);

  const handleRunRegression = async () => {
    if (!confirm('确定要重新运行回归测试吗？已人工确认的样本最终结果不会被覆盖。')) return;
    try {
      await runRegression(batchId);
      alert('回归测试完成');
      loadData();
    } catch (e) {
      alert('运行失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleExport = () => {
    exportBatch(batchId);
  };

  const openCorrectModal = (sample) => {
    setCorrectModal(sample);
    setCorrectForm({ new_result: sample.final_result || 'pass', reason: '' });
  };

  const handleCorrect = async (e) => {
    e.preventDefault();
    if (!correctForm.reason.trim()) {
      alert('请填写修正原因');
      return;
    }
    try {
      await correctSample(correctModal.sample_id, correctForm);
      alert('修正成功，已记录修正原因');
      setCorrectModal(null);
      loadData();
    } catch (e) {
      alert('修正失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const openHistory = async (sampleId) => {
    try {
      const res = await getSampleHistory(sampleId);
      setHistory(res.data);
      setHistoryModal(sampleId);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !summary) return <div className="loading">加载中...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/batches')}>← 返回</button>
        <h2 style={{ margin: 0 }}>批次详情: {batchId}</h2>
      </div>

      <div className="summary-grid">
        <div className="summary-item">
          <div className="label">样本总数</div>
          <div className="value primary">{summary.total}</div>
        </div>
        <div className="summary-item">
          <div className="label">通过</div>
          <div className="value success">{summary.by_result.pass}</div>
        </div>
        <div className="summary-item">
          <div className="label">拦截</div>
          <div className="value danger">{summary.by_result.block}</div>
        </div>
        <div className="summary-item">
          <div className="label">已人工确认</div>
          <div className="value warning">{summary.confirmed}</div>
        </div>
        <div className="summary-item">
          <div className="label">待确认</div>
          <div className="value">{summary.unconfirmed}</div>
        </div>
        <div className="summary-item">
          <div className="label">通过率</div>
          <div className="value success">{summary.pass_rate}%</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0 }}>样本列表</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-success" onClick={handleRunRegression}>重新运行回归</button>
            <button className="btn btn-primary" onClick={handleExport}>导出 CSV</button>
          </div>
        </div>

        <div className="filter-bar">
          <span style={{ fontSize: 13, color: '#6b7280' }}>筛选:</span>
          <select value={filter.sample_type} onChange={e => setFilter({ ...filter, sample_type: e.target.value })}>
            <option value="">全部类型</option>
            <option value="normal">正常样本</option>
            <option value="boundary">边界样本</option>
            <option value="bad">明显坏样本</option>
          </select>
          <select value={filter.final_result} onChange={e => setFilter({ ...filter, final_result: e.target.value })}>
            <option value="">全部结果</option>
            <option value="pass">通过</option>
            <option value="block">拦截</option>
          </select>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>样本ID</th>
              <th>类型</th>
              <th>内容</th>
              <th>预期</th>
              <th>自动判定</th>
              <th>最终结论</th>
              <th>状态</th>
              <th>命中规则</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {samples.map(s => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.sample_id}</td>
                <td>
                  <span className={`badge ${sampleTypeLabels[s.sample_type]?.className}`}>
                    {sampleTypeLabels[s.sample_type]?.text}
                  </span>
                </td>
                <td>
                  <div className="content-text">{s.content}</div>
                  {s.note && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>备注: {s.note}</div>}
                </td>
                <td>
                  {resultLabels[s.expected_result] && (
                    <span className={`badge ${resultLabels[s.expected_result].className}`}>
                      {resultLabels[s.expected_result].text}
                    </span>
                  )}
                </td>
                <td>
                  {resultLabels[s.auto_result] && (
                    <span className={`badge ${resultLabels[s.auto_result].className}`}>
                      {resultLabels[s.auto_result].text}
                    </span>
                  )}
                </td>
                <td>
                  {resultLabels[s.final_result] && (
                    <span className={`badge ${resultLabels[s.final_result].className}`}>
                      {resultLabels[s.final_result].text}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`badge ${s.is_confirmed ? 'badge-confirmed' : 'badge-unconfirmed'}`}>
                    {s.is_confirmed ? '已确认' : '未确认'}
                  </span>
                </td>
                <td>
                  {s.auto_hit_rules && s.auto_hit_rules.length > 0 ? (
                    <div className="hit-rules">
                      {s.auto_hit_rules.map((r, i) => (
                        <span key={i} className="rule-tag">{r.rule_name}</span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>无</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => openCorrectModal(s)}>修正</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openHistory(s.sample_id)}>历史</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {correctModal && (
        <div className="modal-overlay" onClick={() => setCorrectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>人工修正判定</h3>
            <div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>样本内容:</div>
              <div>{correctModal.content}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                当前最终结论: {correctModal.final_result === 'block' ? '拦截' : correctModal.final_result === 'pass' ? '通过' : '待确认'}
              </div>
            </div>
            <form onSubmit={handleCorrect}>
              <div className="form-group">
                <label>修正后结论</label>
                <select value={correctForm.new_result} onChange={e => setCorrectForm({ ...correctForm, new_result: e.target.value })}>
                  <option value="pass">通过</option>
                  <option value="block">拦截</option>
                </select>
              </div>
              <div className="form-group">
                <label>修正原因（必填，将永久记录）</label>
                <textarea
                  value={correctForm.reason}
                  onChange={e => setCorrectForm({ ...correctForm, reason: e.target.value })}
                  rows={3}
                  placeholder="请说明为什么要修正这个结论"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setCorrectModal(null)}>取消</button>
                <button type="submit" className="btn btn-primary">确认修正</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>修正历史记录</h3>
            {history.length === 0 ? (
              <p style={{ color: '#6b7280' }}>暂无修正记录</p>
            ) : (
              <div className="timeline">
                {history.map(h => (
                  <div key={h.id} className="timeline-item">
                    <div className="time">
                      {new Date(h.corrected_at).toLocaleString()} · {h.operator}
                    </div>
                    <div className="content">
                      <strong>
                        {h.old_result === 'block' ? '拦截' : h.old_result === 'pass' ? '通过' : '待确认'}
                        {' → '}
                        {h.new_result === 'block' ? '拦截' : h.new_result === 'pass' ? '通过' : '待确认'}
                      </strong>
                      <div style={{ marginTop: 4, color: '#6b7280' }}>原因: {h.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setHistoryModal(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
