import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBatches, getBatchSamples, correctSample, getSampleHistory } from '../api.js';

const sampleTypeLabels = {
  normal: { text: '正常样本', className: 'badge-normal' },
  boundary: { text: '边界样本', className: 'badge-boundary' },
  bad: { text: '明显坏样本', className: 'badge-bad' }
};

const resultLabels = {
  pass: { text: '通过', className: 'badge-pass' },
  block: { text: '拦截', className: 'badge-block' }
};

export default function ManualCorrect() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('unconfirmed');
  const [correctModal, setCorrectModal] = useState(null);
  const [correctForm, setCorrectForm] = useState({ new_result: '', reason: '' });
  const [historyModal, setHistoryModal] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getBatches().then(res => setBatches(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      loadSamples();
    } else {
      setSamples([]);
    }
  }, [selectedBatch, filter]);

  const loadSamples = async () => {
    setLoading(true);
    try {
      const params = {};
      const res = await getBatchSamples(selectedBatch, params);
      let data = res.data;
      if (filter === 'unconfirmed') {
        data = data.filter(s => !s.is_confirmed);
      } else if (filter === 'confirmed') {
        data = data.filter(s => s.is_confirmed);
      } else if (filter === 'mismatch') {
        data = data.filter(s => s.final_result !== s.expected_result);
      }
      setSamples(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
      alert('修正成功');
      setCorrectModal(null);
      loadSamples();
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

  const batchCorrectAll = async (result) => {
    if (samples.length === 0) return;
    const reason = prompt(`请输入批量${result === 'block' ? '拦截' : '通过'}的原因:`);
    if (!reason) return;
    
    let success = 0, fail = 0;
    for (const s of samples) {
      try {
        await correctSample(s.sample_id, { new_result: result, reason });
        success++;
      } catch (e) {
        fail++;
      }
    }
    alert(`批量完成：成功 ${success} 条，失败 ${fail} 条`);
    loadSamples();
  };

  return (
    <div>
      <div className="card">
        <h2>人工修正 - 日常入口</h2>
        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 13 }}>
          日常的标注修正工作在这里进行。月底或课前可在批次详情中查看安全拦截的完整解释。
        </p>

        <div className="filter-bar">
          <span style={{ fontSize: 13, color: '#6b7280' }}>选择批次:</span>
          <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">-- 请选择 --</option>
            {batches.map(b => (
              <option key={b.id} value={b.batch_id}>{b.batch_name} ({b.batch_id})</option>
            ))}
          </select>

          <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 12 }}>筛选:</span>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="unconfirmed">未确认</option>
            <option value="confirmed">已确认</option>
            <option value="mismatch">判定与预期不符</option>
            <option value="all">全部</option>
          </select>

          {selectedBatch && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => batchCorrectAll('pass')}>
                全部标记通过
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => batchCorrectAll('block')}>
                全部标记拦截
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/batches/${selectedBatch}`)}>
                查看批次详情
              </button>
            </>
          )}
        </div>

        {!selectedBatch ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>✏️</div>
            <p>请先选择一个批次开始人工修正</p>
          </div>
        ) : loading ? (
          <div className="loading">加载中...</div>
        ) : samples.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>✅</div>
            <p>当前筛选条件下没有需要处理的样本</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>样本ID</th>
                <th>类型</th>
                <th>内容</th>
                <th>预期</th>
                <th>自动判定</th>
                <th>当前结论</th>
                <th>命中规则</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {samples.map(s => (
                <tr key={s.id} style={s.final_result !== s.expected_result ? { background: '#fff7ed' } : {}}>
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
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {s.is_confirmed ? '✓ 已确认' : '○ 未确认'}
                    </div>
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
        )}
      </div>

      {correctModal && (
        <div className="modal-overlay" onClick={() => setCorrectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>人工修正判定</h3>
            <div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>样本内容:</div>
              <div>{correctModal.content}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                当前结论: {correctModal.final_result === 'block' ? '拦截' : correctModal.final_result === 'pass' ? '通过' : '待确认'}
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
