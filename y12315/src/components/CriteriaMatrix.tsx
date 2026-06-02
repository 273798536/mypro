import React, { useState } from 'react';
import { useAppStore } from '../store';

const CriteriaMatrix: React.FC = () => {
  const {
    criteria,
    criteriaMatrix,
    updateCriteriaMatrix,
    subMatrices,
    updateSubMatrix,
    weightModifications
  } = useAppStore();
  
  const [activeSubMatrix, setActiveSubMatrix] = useState<string | null>(null);

  const rootCriteria = criteria.filter(c => !c.parentId);
  const parentCriteria = criteria.filter(c => 
    criteria.some(child => child.parentId === c.id)
  );

  const handleMatrixChange = (row: number, col: number, value: number) => {
    if (activeSubMatrix) {
      updateSubMatrix(activeSubMatrix, row, col, value);
    } else {
      updateCriteriaMatrix(row, col, value);
    }
  };

  const currentMatrix = activeSubMatrix 
    ? subMatrices.get(activeSubMatrix)
    : criteriaMatrix;

  const currentCriteria = activeSubMatrix
    ? criteria.filter(c => c.parentId === activeSubMatrix)
    : rootCriteria;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">判断矩阵构建</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`tab ${!activeSubMatrix ? 'active' : ''}`}
              onClick={() => setActiveSubMatrix(null)}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              一级指标矩阵
            </button>
            {parentCriteria.map(c => (
              <button
                key={c.id}
                className={`tab ${activeSubMatrix === c.id ? 'active' : ''}`}
                onClick={() => setActiveSubMatrix(c.id)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {c.name}子矩阵
              </button>
            ))}
          </div>
        </div>

        {currentMatrix && (
          <>
            <div className={`consistency-status ${currentMatrix.isConsistent ? 'consistent' : 'inconsistent'}`}>
              <span style={{ fontSize: '20px' }}>
                {currentMatrix.isConsistent ? '✓' : '⚠'}
              </span>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {currentMatrix.isConsistent ? '矩阵一致性通过' : '矩阵一致性不达标'}
                </div>
                <div style={{ fontSize: '12px' }}>
                  一致性比例 (CR): {(currentMatrix.consistencyRatio * 100).toFixed(2)}%
                  {currentMatrix.isConsistent ? ' (≤ 10%)' : ' (> 10%)'}
                </div>
              </div>
            </div>

            {!currentMatrix.isConsistent && (
              <div className="weight-modification">
                <strong>💡 矩阵不一致提示：</strong>
                <p style={{ marginTop: '8px', fontSize: '13px' }}>
                  当前判断矩阵的一致性比例超过10%，建议调整判断值。
                  可重点关注对角线上偏差较大的比较项，重新评估相对重要性。
                </p>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '120px' }}>指标</th>
                    {currentCriteria.map((c, i) => (
                      <th key={i} style={{ textAlign: 'center' }}>
                        {c.name}
                      </th>
                    ))}
                    <th style={{ textAlign: 'center', background: '#667eea', color: 'white' }}>
                      权重
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentCriteria.map((rowCriterion, rowIndex) => (
                    <tr key={rowCriterion.id}>
                      <td style={{ fontWeight: 500 }}>
                        {rowCriterion.name}
                      </td>
                      {currentCriteria.map((_, colIndex) => (
                        <td key={colIndex} className="matrix-cell">
                          {rowIndex === colIndex ? (
                            <span style={{ color: '#999' }}>1</span>
                          ) : rowIndex < colIndex ? (
                            <input
                              type="number"
                              className="matrix-input"
                              value={currentMatrix.matrix[rowIndex][colIndex]}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 1;
                                handleMatrixChange(rowIndex, colIndex, val);
                              }}
                              min="1/9"
                              max="9"
                              step="0.5"
                            />
                          ) : (
                            <span style={{ color: '#667eea', fontWeight: 500 }}>
                              1/{currentMatrix.matrix[colIndex][rowIndex].toFixed(2)}
                            </span>
                          )}
                        </td>
                      ))}
                      <td style={{ 
                        textAlign: 'center', 
                        fontWeight: 600, 
                        background: '#667eea15',
                        color: '#667eea'
                      }}>
                        {(currentMatrix.weights[rowIndex] * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#666' }}>
                萨蒂标度参考 (1-9)
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '12px',
                fontSize: '12px'
              }}>
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <strong>1</strong> - 同等重要
                </div>
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <strong>3</strong> - 稍微重要
                </div>
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <strong>5</strong> - 明显重要
                </div>
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <strong>7</strong> - 强烈重要
                </div>
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <strong>9</strong> - 极端重要
                </div>
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <strong>2,4,6,8</strong> - 中间值
                </div>
              </div>
            </div>
          </>
        )}

        {!criteriaMatrix && (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">请先设置评估指标，系统将自动生成判断矩阵</div>
          </div>
        )}
      </div>

      {weightModifications.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">权重人工修改记录</h2>
          </div>
          
          {weightModifications.map(mod => (
            <div key={mod.id} className="weight-modification">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <strong style={{ color: '#f5a623' }}>{mod.criterionName}</strong>
                  <span style={{ marginLeft: '12px', fontSize: '12px', color: '#999' }}>
                    {mod.modifiedAt} - {mod.modifiedBy}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                权重变化：
                <span style={{ color: '#999' }}>{(mod.originalWeight * 100).toFixed(2)}%</span>
                <span style={{ margin: '0 8px' }}>→</span>
                <span style={{ color: '#667eea', fontWeight: 600 }}>{(mod.newWeight * 100).toFixed(2)}%</span>
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                修改原因：{mod.reason}
              </div>
              <div style={{ fontSize: '13px' }}>
                <strong>排名影响：</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  {mod.impactOnRanking.map(impact => (
                    <li key={impact.supplierId} style={{ marginBottom: '4px' }}>
                      {impact.supplierName}：
                      第{impact.originalRank}名 → 第{impact.newRank}名
                      <span className={impact.scoreChange > 0 ? 'impact-positive' : 'impact-negative'} style={{ marginLeft: '8px' }}>
                        ({impact.scoreChange > 0 ? '+' : ''}{(impact.scoreChange * 100).toFixed(2)}分)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CriteriaMatrix;
