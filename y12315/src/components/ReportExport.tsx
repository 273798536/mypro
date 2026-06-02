import React, { useMemo } from 'react';
import { useAppStore } from '../store';
import { generateRankingExplanation } from '../utils/ahp';
import * as XLSX from 'xlsx';

const ReportExport: React.FC = () => {
  const { 
    rankings, 
    suppliers, 
    criteria, 
    scores,
    criteriaMatrix,
    weightModifications,
    versionHistory 
  } = useAppStore();

  const rankingExplanation = useMemo(() => {
    return generateRankingExplanation(rankings, weightModifications);
  }, [rankings, weightModifications]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const rankingData = rankings.map((r) => ({
      '排名': r.rank,
      '供应商名称': r.supplierName,
      '综合得分': (r.totalScore * 100).toFixed(2),
      '报价金额': r.quotation ? `¥${r.quotation.toLocaleString()}` : '报价缺失',
      '风险备注': r.riskNotes || '无'
    }));
    const ws1 = XLSX.utils.json_to_sheet(rankingData);
    XLSX.utils.book_append_sheet(wb, ws1, '综合排名');

    const scoreData = suppliers.flatMap(supplier => {
      return criteria
        .filter(c => !criteria.some(child => child.parentId === c.id))
        .map(criterion => {
          const score = scores.find(
            s => s.supplierId === supplier.id && s.criterionId === criterion.id
          );
          return {
            '供应商': supplier.name,
            '评估指标': criterion.name,
            '得分': score?.value ? (score.value * 100).toFixed(2) : '未评分',
            '备注': score?.note || '',
            '资料来源': score?.sourceReference || ''
          };
        });
    });
    const ws2 = XLSX.utils.json_to_sheet(scoreData);
    XLSX.utils.book_append_sheet(wb, ws2, '评分明细');

    if (criteriaMatrix) {
      const rootCriteria = criteria.filter(c => !c.parentId);
      const matrixData = rootCriteria.map((c, i) => ({
        '指标': c.name,
        ...rootCriteria.reduce((acc, rc, j) => {
          acc[rc.name] = criteriaMatrix.matrix[i][j];
          return acc;
        }, {} as Record<string, number>),
        '权重': `${(criteriaMatrix.weights[i] * 100).toFixed(2)}%`
      }));
      const ws3 = XLSX.utils.json_to_sheet(matrixData);
      XLSX.utils.book_append_sheet(wb, ws3, '判断矩阵');
    }

    const modData = weightModifications.map(m => ({
      '指标名称': m.criterionName,
      '原权重': `${(m.originalWeight * 100).toFixed(2)}%`,
      '新权重': `${(m.newWeight * 100).toFixed(2)}%`,
      '修改人': m.modifiedBy,
      '修改时间': m.modifiedAt,
      '修改原因': m.reason
    }));
    const ws4 = XLSX.utils.json_to_sheet(modData);
    XLSX.utils.book_append_sheet(wb, ws4, '权重修改记录');

    const historyData = versionHistory.map(v => ({
      '版本': `v${v.version}`,
      '保存时间': new Date(v.timestamp).toLocaleString(),
      '修改人': v.modifiedBy,
      '变更内容': v.changes.join('; ')
    }));
    const ws5 = XLSX.utils.json_to_sheet(historyData);
    XLSX.utils.book_append_sheet(wb, ws5, '版本历史');

    XLSX.writeFile(wb, `层次分析评审报告_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportReportText = () => {
    let report = '='.repeat(60) + '\n';
    report += '           层次分析法(AHP)供应商评审报告\n';
    report += '='.repeat(60) + '\n\n';
    report += `报告生成时间：${new Date().toLocaleString()}\n`;
    report += `评审供应商数量：${suppliers.length}家\n`;
    report += `评估指标数量：${criteria.length}个\n\n`;
    report += '-'.repeat(60) + '\n\n';
    
    report += rankingExplanation + '\n\n';
    report += '-'.repeat(60) + '\n\n';

    report += '【各供应商得分明细】\n\n';
    rankings.forEach(r => {
      report += `第${r.rank}名：${r.supplierName}\n`;
      report += `  综合得分：${(r.totalScore * 100).toFixed(2)}分\n`;
      report += `  报价金额：${r.quotation ? `¥${r.quotation.toLocaleString()}` : '报价缺失'}\n`;
      if (r.riskNotes) {
        report += `  风险备注：${r.riskNotes}\n`;
      }
      report += '  各指标得分：\n';
      r.scoresByCriterion.forEach(s => {
        report += `    ${s.criterionName}：${(s.score * 100).toFixed(2)}分 (权重${(s.weight * 100).toFixed(2)}%)\n`;
      });
      report += '\n';
    });

    if (weightModifications.length > 0) {
      report += '-'.repeat(60) + '\n\n';
      report += '【权重人工调整记录】\n\n';
      weightModifications.forEach((m, i) => {
        report += `${i + 1}. ${m.criterionName}\n`;
        report += `   原权重：${(m.originalWeight * 100).toFixed(2)}% → 调整后：${(m.newWeight * 100).toFixed(2)}%\n`;
        report += `   修改人：${m.modifiedBy}\n`;
        report += `   修改时间：${m.modifiedAt}\n`;
        report += `   修改原因：${m.reason}\n`;
        report += `   排名影响：\n`;
        m.impactOnRanking.forEach(impact => {
          report += `     - ${impact.supplierName}：第${impact.originalRank}名 → 第${impact.newRank}名 `;
          report += `(${impact.scoreChange > 0 ? '+' : ''}${(impact.scoreChange * 100).toFixed(2)}分)\n`;
        });
        report += '\n';
      });
    }

    if (versionHistory.length > 0) {
      report += '-'.repeat(60) + '\n\n';
      report += '【版本历史记录】\n\n';
      versionHistory.forEach(v => {
        report += `版本 v${v.version}\n`;
        report += `  保存时间：${new Date(v.timestamp).toLocaleString()}\n`;
        report += `  修改人：${v.modifiedBy}\n`;
        report += `  变更内容：${v.changes.join('；')}\n\n`;
      });
    }

    report += '='.repeat(60) + '\n';
    report += '                    报告结束\n';
    report += '='.repeat(60) + '\n';

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `层次分析评审报告_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">评审报告导出</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={exportReportText}>
              📄 导出文本报告
            </button>
            <button className="btn btn-primary" onClick={exportToExcel}>
              📊 导出Excel报告
            </button>
          </div>
        </div>

        <div className="card" style={{ boxShadow: 'none', border: '1px solid #eee' }}>
          <h3 className="card-title" style={{ marginBottom: '16px', fontSize: '16px' }}>
            排名解释
          </h3>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'inherit',
            fontSize: '14px',
            lineHeight: '1.8',
            color: '#333',
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px'
          }}>
            {rankingExplanation}
          </pre>
        </div>

        <div className="grid-2" style={{ marginTop: '20px' }}>
          <div className="stat-card">
            <div className="stat-value">{rankings.length}</div>
            <div className="stat-label">参评供应商</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{criteria.length}</div>
            <div className="stat-label">评估指标数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: weightModifications.length > 0 ? '#f5a623' : '#667eea' }}>
              {weightModifications.length}
            </div>
            <div className="stat-label">权重修改次数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#4caf50' }}>{versionHistory.length}</div>
            <div className="stat-label">历史版本数</div>
          </div>
        </div>
      </div>

      {weightModifications.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">权重修改对排名的影响分析</h2>
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th>修改指标</th>
                <th>权重变化</th>
                <th>受影响供应商</th>
                <th>排名变化</th>
                <th>得分影响</th>
              </tr>
            </thead>
            <tbody>
              {weightModifications.flatMap(mod =>
                mod.impactOnRanking.map((impact, i) => (
                  <tr key={`${mod.id}-${i}`} className={i === 0 ? '' : ''}>
                    {i === 0 && (
                      <>
                        <td rowSpan={mod.impactOnRanking.length} style={{ verticalAlign: 'middle' }}>
                          <strong>{mod.criterionName}</strong>
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            {mod.modifiedBy} · {new Date(mod.modifiedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td rowSpan={mod.impactOnRanking.length} style={{ verticalAlign: 'middle' }}>
                          <div>{(mod.originalWeight * 100).toFixed(2)}%</div>
                          <div style={{ color: '#999' }}>↓</div>
                          <div style={{ color: '#667eea', fontWeight: 600 }}>
                            {(mod.newWeight * 100).toFixed(2)}%
                          </div>
                        </td>
                      </>
                    )}
                    <td>{impact.supplierName}</td>
                    <td>
                      第{impact.originalRank}名 → 第{impact.newRank}名
                      {impact.newRank < impact.originalRank && (
                        <span className="badge badge-success" style={{ marginLeft: '8px' }}>↑上升</span>
                      )}
                      {impact.newRank > impact.originalRank && (
                        <span className="badge badge-danger" style={{ marginLeft: '8px' }}>↓下降</span>
                      )}
                    </td>
                    <td className={impact.scoreChange > 0 ? 'impact-positive' : 'impact-negative'}>
                      {impact.scoreChange > 0 ? '+' : ''}{(impact.scoreChange * 100).toFixed(2)}分
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">供应商-指标-报告 对应关系</h2>
        </div>
        
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
          💡 以下为评审数据的溯源关系，便于后续复核
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>供应商</th>
              <th>资料来源</th>
              <th>评估指标</th>
              <th>评分来源</th>
              <th>报告对应</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.flatMap(supplier => {
              const supplierScores = scores.filter(s => s.supplierId === supplier.id);
              return supplierScores.map((score, i) => {
                const criterion = criteria.find(c => c.id === score.criterionId);
                return (
                  <tr key={`${supplier.id}-${score.criterionId}`}>
                    {i === 0 && (
                      <>
                        <td rowSpan={supplierScores.length} style={{ verticalAlign: 'middle', fontWeight: 500 }}>
                          {supplier.name}
                        </td>
                        <td rowSpan={supplierScores.length} style={{ verticalAlign: 'middle' }} className="source-reference">
                          {supplier.sourceReference}
                        </td>
                      </>
                    )}
                    <td>{criterion?.name}</td>
                    <td className="source-reference">{score.sourceReference || '-'}</td>
                    {i === 0 && (
                      <td rowSpan={supplierScores.length} style={{ verticalAlign: 'middle' }}>
                        <span className="badge badge-info">综合排名表</span>
                        <span className="badge badge-info" style={{ marginLeft: '4px' }}>得分明细</span>
                      </td>
                    )}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportExport;
