import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const RankingPanel: React.FC = () => {
  const { rankings, suppliers, filterCriteria, setFilterCriteria, versionHistory, showHistory, setShowHistory, calculateRankings } = useAppStore();
  const [selectedRank, setSelectedRank] = useState<string | null>(null);

  const filteredRankings = useMemo(() => {
    let result = [...rankings];
    
    if (filterCriteria.minScore !== undefined) {
      result = result.filter(r => r.totalScore >= filterCriteria.minScore!);
    }
    if (filterCriteria.maxScore !== undefined) {
      result = result.filter(r => r.totalScore <= filterCriteria.maxScore!);
    }
    if (filterCriteria.quotationRange) {
      result = result.filter(r => {
        const supplier = suppliers.find(s => s.id === r.supplierId);
        const quote = supplier?.quotation || 0;
        if (filterCriteria.quotationRange!.min !== undefined && quote < filterCriteria.quotationRange!.min!) return false;
        if (filterCriteria.quotationRange!.max !== undefined && quote > filterCriteria.quotationRange!.max!) return false;
        return true;
      });
    }
    if (filterCriteria.selectedSuppliers && filterCriteria.selectedSuppliers.length > 0) {
      result = result.filter(r => filterCriteria.selectedSuppliers!.includes(r.supplierId));
    }
    
    return result;
  }, [rankings, filterCriteria, suppliers]);

  const chartData = useMemo(() => {
    return filteredRankings.map(r => ({
      name: r.supplierName,
      score: Math.round(r.totalScore * 10000) / 100,
      quotation: (suppliers.find(s => s.id === r.supplierId)?.quotation || 0) / 10000
    }));
  }, [filteredRankings, suppliers]);

  const radarData = useMemo(() => {
    if (filteredRankings.length === 0) return [];
    
    const criteria = filteredRankings[0].scoresByCriterion.map(s => s.criterionName);
    return criteria.map(criterion => {
      const data: any = { criterion };
      filteredRankings.forEach(r => {
        const score = r.scoresByCriterion.find(s => s.criterionName === criterion);
        data[r.supplierName] = score ? Math.round(score.score * 100) : 0;
      });
      return data;
    });
  }, [filteredRankings]);

  const selectedSupplierData = selectedRank 
    ? rankings.find(r => r.supplierId === selectedRank)
    : null;

  const colors = ['#667eea', '#764ba2', '#f5a623', '#4caf50', '#ff6b6b'];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">综合排名结果</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className={`btn ${showHistory ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowHistory(!showHistory)}
            >
              📜 {showHistory ? '隐藏历史' : '查看历史'}
            </button>
            <button className="btn btn-primary" onClick={() => calculateRankings()}>
              🔄 重新计算
            </button>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-item">
            <label className="filter-label">最低得分:</label>
            <input
              type="number"
              className="filter-input"
              placeholder="0.00"
              step="0.01"
              min="0"
              max="1"
              value={filterCriteria.minScore || ''}
              onChange={(e) => setFilterCriteria({
                ...filterCriteria,
                minScore: e.target.value ? parseFloat(e.target.value) : undefined
              })}
            />
          </div>
          <div className="filter-item">
            <label className="filter-label">最高得分:</label>
            <input
              type="number"
              className="filter-input"
              placeholder="1.00"
              step="0.01"
              min="0"
              max="1"
              value={filterCriteria.maxScore || ''}
              onChange={(e) => setFilterCriteria({
                ...filterCriteria,
                maxScore: e.target.value ? parseFloat(e.target.value) : undefined
              })}
            />
          </div>
          <div className="filter-item">
            <label className="filter-label">报价范围(万):</label>
            <input
              type="number"
              className="filter-input"
              placeholder="最低"
              value={filterCriteria.quotationRange?.min || ''}
              onChange={(e) => setFilterCriteria({
                ...filterCriteria,
                quotationRange: {
                  ...filterCriteria.quotationRange,
                  min: e.target.value ? parseFloat(e.target.value) * 10000 : undefined
                }
              })}
            />
            <span>-</span>
            <input
              type="number"
              className="filter-input"
              placeholder="最高"
              value={filterCriteria.quotationRange?.max ? filterCriteria.quotationRange.max / 10000 : ''}
              onChange={(e) => setFilterCriteria({
                ...filterCriteria,
                quotationRange: {
                  ...filterCriteria.quotationRange,
                  max: e.target.value ? parseFloat(e.target.value) * 10000 : undefined
                }
              })}
            />
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setFilterCriteria({})}
          >
            重置筛选
          </button>
        </div>

        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-value">{filteredRankings.length}</div>
            <div className="stat-label">供应商数量</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {filteredRankings.length > 0 
                ? (Math.max(...filteredRankings.map(r => r.totalScore)) * 100).toFixed(2) + '%'
                : '-'}
            </div>
            <div className="stat-label">最高得分</div>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>排名</th>
              <th>供应商名称</th>
              <th>综合得分</th>
              <th>报价金额</th>
              <th>风险备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRankings.map((ranking, index) => (
              <tr 
                key={ranking.supplierId}
                className={index === 0 ? 'ranking-highlight' : ''}
                onClick={() => setSelectedRank(ranking.supplierId)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: index === 0 ? 'linear-gradient(135deg, #f5a623 0%, #f7b731 100%)' : 
                               index === 1 ? 'linear-gradient(135deg, #95a5a6 0%, #bdc3c7 100%)' :
                               index === 2 ? 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)' : '#ecf0f1',
                    color: index < 3 ? 'white' : '#666',
                    textAlign: 'center',
                    lineHeight: '28px',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}>
                    {ranking.rank}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{ranking.supplierName}</td>
                <td>
                  <span style={{ 
                    fontSize: '18px', 
                    fontWeight: 700, 
                    color: index === 0 ? '#667eea' : '#333'
                  }}>
                    {(ranking.totalScore * 100).toFixed(2)}
                  </span>
                  <span style={{ color: '#999', marginLeft: '4px' }}>分</span>
                </td>
                <td>
                  {ranking.quotation 
                    ? `¥${ranking.quotation.toLocaleString()}`
                    : <span className="badge badge-danger">报价缺失</span>}
                </td>
                <td>
                  {ranking.riskNotes ? (
                    <span style={{ fontSize: '12px', color: '#e74c3c' }}>
                      ⚠ {ranking.riskNotes.substring(0, 20)}...
                    </span>
                  ) : '-'}
                </td>
                <td>
                  <button className="btn btn-secondary btn-sm">
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRankings.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <div className="empty-state-text">暂无排名数据，请先完成评分和计算</div>
          </div>
        )}
      </div>

      {selectedSupplierData && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">得分明细 - {selectedSupplierData.supplierName}</h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedRank(null)}
            >
              关闭
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>评估指标</th>
                <th>指标权重</th>
                <th>得分</th>
                <th>加权得分</th>
              </tr>
            </thead>
            <tbody>
              {selectedSupplierData.scoresByCriterion.map((item, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 500 }}>{item.criterionName}</td>
                  <td>{(item.weight * 100).toFixed(2)}%</td>
                  <td style={{ color: item.score >= 0.8 ? '#155724' : item.score >= 0.6 ? '#856404' : '#721c24' }}>
                    {(item.score * 100).toFixed(2)}分
                  </td>
                  <td style={{ fontWeight: 600, color: '#667eea' }}>
                    {(item.weightedScore * 100).toFixed(4)}分
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#f8f9fa', fontWeight: 600 }}>
                <td colSpan={2}>合计</td>
                <td>-</td>
                <td style={{ color: '#667eea', fontSize: '16px' }}>
                  {(selectedSupplierData.totalScore * 100).toFixed(2)}分
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '20px' }}>综合得分对比</h3>
          <div className="chart-container" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)}分`, '综合得分']} />
                <Bar dataKey="score" fill="#667eea" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '20px' }}>各维度雷达图</h3>
          <div className="chart-container" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="criterion" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                {filteredRankings.map((r, i) => (
                  <Radar
                    key={r.supplierId}
                    name={r.supplierName}
                    dataKey={r.supplierName}
                    stroke={colors[i % colors.length]}
                    fill={colors[i % colors.length]}
                    fillOpacity={0.2}
                  />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showHistory && versionHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">历史版本对比</h2>
          </div>
          
          {versionHistory.map(version => (
            <div key={version.id} className="history-item">
              <div className="history-version">版本 v{version.version}</div>
              <div className="history-time">
                {new Date(version.timestamp).toLocaleString()} · {version.modifiedBy}
              </div>
              <div className="history-changes">
                <strong>变更内容：</strong>
                {version.changes.map((change, i) => (
                  <span key={i} style={{ marginLeft: '8px' }}>• {change}</span>
                ))}
              </div>
              <div style={{ marginTop: '12px' }}>
                <strong>当时排名：</strong>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {version.rankings.slice(0, 3).map((r, i) => (
                    <span key={r.supplierId} style={{ fontSize: '13px' }}>
                      第{r.rank}名：{r.supplierName} ({(r.totalScore * 100).toFixed(2)}分)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingPanel;
