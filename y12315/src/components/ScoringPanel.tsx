import React, { useState } from 'react';
import { useAppStore } from '../store';

const ScoringPanel: React.FC = () => {
  const { suppliers, criteria, scores, updateScore, calculateRankings, saveVersion, rankings, weightModifications } = useAppStore();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingScore, setEditingScore] = useState<{ supplierId: string; criterionId: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [lastCalcDiff, setLastCalcDiff] = useState<string | null>(null);

  const leafCriteria = criteria.filter(c => 
    !criteria.some(child => child.parentId === c.id)
  );

  const getScoreValue = (supplierId: string, criterionId: string) => {
    return scores.find(s => s.supplierId === supplierId && s.criterionId === criterionId)?.value || 0;
  };

  const getScoreNote = (supplierId: string, criterionId: string) => {
    return scores.find(s => s.supplierId === supplierId && s.criterionId === criterionId)?.note || '';
  };

  const getSourceReference = (supplierId: string, criterionId: string) => {
    return scores.find(s => s.supplierId === supplierId && s.criterionId === criterionId)?.sourceReference || '';
  };

  const handleScoreChange = (supplierId: string, criterionId: string, value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    updateScore(supplierId, criterionId, clampedValue);
  };

  const handleOpenNote = (supplierId: string, criterionId: string) => {
    setEditingScore({ supplierId, criterionId });
    setNoteText(getScoreNote(supplierId, criterionId));
    setShowNoteModal(true);
  };

  const handleSaveNote = () => {
    if (editingScore) {
      const currentScore = getScoreValue(editingScore.supplierId, editingScore.criterionId);
      updateScore(editingScore.supplierId, editingScore.criterionId, currentScore, noteText);
    }
    setShowNoteModal(false);
    setEditingScore(null);
  };

  const handleRecalcAndSave = () => {
    const oldRankings = [...rankings];
    calculateRankings();
    const state = useAppStore.getState();
    const newRankings = state.rankings;

    const diffs: string[] = [];
    for (const newR of newRankings) {
      const oldR = oldRankings.find(o => o.supplierId === newR.supplierId);
      if (!oldR) continue;
      if (oldR.rank !== newR.rank || Math.abs(oldR.totalScore - newR.totalScore) > 0.00005) {
        const scoreDelta = Math.round((newR.totalScore - oldR.totalScore) * 10000) / 10000;
        diffs.push(
          `${newR.supplierName}: 第${oldR.rank}名→第${newR.rank}名 (${scoreDelta > 0 ? '+' : ''}${(scoreDelta * 100).toFixed(2)}分)`
        );
      }
    }

    if (diffs.length > 0) {
      setLastCalcDiff(`排名变动: ${diffs.join('; ')}`);
    } else {
      setLastCalcDiff('排名无变化');
    }
  };

  const handleSaveVersion = () => {
    const diffText = lastCalcDiff || '评分更新';
    saveVersion('评审组', [diffText]);
    setLastCalcDiff(null);
  };

  const getScoreColor = (value: number) => {
    if (value >= 0.9) return '#155724';
    if (value >= 0.7) return '#856404';
    if (value >= 0.5) return '#0c5460';
    return '#721c24';
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">指标评分</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleRecalcAndSave}>
              🔄 重新计算排名
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveVersion}
            >
              💾 保存版本
            </button>
          </div>
        </div>

        {lastCalcDiff && (
          <div style={{
            padding: '12px 16px',
            background: lastCalcDiff === '排名无变化' ? '#d4edda' : '#fff3cd',
            color: lastCalcDiff === '排名无变化' ? '#155724' : '#856404',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 500
          }}>
            📊 {lastCalcDiff}
          </div>
        )}

        {weightModifications.length > 0 && (
          <div style={{
            padding: '12px 16px',
            background: '#fff9e6',
            borderLeft: '4px solid #f5a623',
            borderRadius: '0 8px 8px 0',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            ⚠ 当前有 {weightModifications.length} 条权重修改记录，排名已受影响。
            保存版本可在历史中追溯前后差异。
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ minWidth: '150px', position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 1 }}>
                  供应商
                </th>
                {leafCriteria.map(c => (
                  <th key={c.id} style={{ minWidth: '120px', textAlign: 'center' }}>
                    <div>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#999', fontWeight: 'normal' }}>
                      {c.description}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td style={{ position: 'sticky', left: 0, background: 'white', fontWeight: 500 }}>
                    <div>{supplier.name}</div>
                    {supplier.quotationStatus !== 'complete' && (
                      <span className={`badge badge-${supplier.quotationStatus === 'missing' ? 'danger' : 'warning'}`}
                        style={{ fontSize: '10px', marginTop: '4px' }}>
                        {supplier.quotationStatus === 'missing' ? '报价缺失' : '部分报价'}
                      </span>
                    )}
                  </td>
                  {leafCriteria.map(criterion => {
                    const value = getScoreValue(supplier.id, criterion.id);
                    const note = getScoreNote(supplier.id, criterion.id);
                    const source = getSourceReference(supplier.id, criterion.id);
                    return (
                      <td key={criterion.id} style={{ textAlign: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <input
                            type="number"
                            className="score-input"
                            value={value === 0 ? '' : value.toFixed(2)}
                            placeholder="0.00"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleScoreChange(supplier.id, criterion.id, val);
                            }}
                            min="0"
                            max="1"
                            step="0.01"
                            style={{ color: getScoreColor(value), fontWeight: 500 }}
                          />
                          {(note || source) && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#667eea',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleOpenNote(supplier.id, criterion.id)}
                            />
                          )}
                        </div>
                        {source && (
                          <div className="source-reference" style={{ marginTop: '4px' }}>
                            {source}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '13px' }}>
            <span style={{ color: '#155724' }}>● ≥ 0.9 优秀</span>
            <span style={{ color: '#856404' }}>● 0.7-0.9 良好</span>
            <span style={{ color: '#0c5460' }}>● 0.5-0.7 一般</span>
            <span style={{ color: '#721c24' }}>● {'<'} 0.5 较差</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            💡 评分范围：0-1，保留2位小数。修改评分后点击「重新计算排名」查看影响，再点「保存版本」保留前后差异。
          </div>
        </div>
      </div>

      {showNoteModal && editingScore && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">评分详情</h3>
              <button className="modal-close" onClick={() => setShowNoteModal(false)}>
                ×
              </button>
            </div>

            <div className="detail-row">
              <span className="detail-label">供应商</span>
              <span className="detail-value">
                {suppliers.find(s => s.id === editingScore.supplierId)?.name}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">评分指标</span>
              <span className="detail-value">
                {criteria.find(c => c.id === editingScore.criterionId)?.name}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">当前评分</span>
              <span className="detail-value" style={{ fontWeight: 600, color: '#667eea' }}>
                {getScoreValue(editingScore.supplierId, editingScore.criterionId).toFixed(2)}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">评分备注</label>
              <textarea
                className="form-textarea"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="输入评分依据或备注说明..."
              />
            </div>

            <div className="detail-row">
              <span className="detail-label">资料来源</span>
              <span className="detail-value source-reference">
                {getSourceReference(editingScore.supplierId, editingScore.criterionId) || '无'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSaveNote}>
                保存备注
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringPanel;
