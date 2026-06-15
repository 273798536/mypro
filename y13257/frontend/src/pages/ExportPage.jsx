import React, { useState, useEffect } from 'react';
import { exportAPI } from '../api';
import { formatDateOnly } from '../utils';

function ExportPage() {
  const [summary, setSummary] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSummary();
  }, [startDate, endDate]);

  const loadSummary = async () => {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const res = await exportAPI.getSummary(params);
      setSummary(res.data);
    } catch (error) {
      console.error('加载汇总数据失败:', error);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = { format: exportFormat };
      if (statusFilter) params.status = statusFilter;
      
      const res = await exportAPI.getComplaints(params);
      
      if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `投诉记录_${formatDateOnly(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        window.open(`/api/export/complaints?format=csv${statusFilter ? '&status=' + statusFilter : ''}`);
      }
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-title">
        数据导出
      </div>

      <div className="card">
        <div className="card-title">
          统计概览
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="filter-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label>开始日期</label>
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ minWidth: '140px' }}
              />
            </div>
            <div className="filter-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label>结束日期</label>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ minWidth: '140px' }}
              />
            </div>
          </div>
        </div>

        {summary && (
          <>
            <div className="stats-grid">
              {summary.status_stats.map(stat => (
                <div key={stat.status} className="stat-card">
                  <div className="stat-label">{stat.status}</div>
                  <div className="stat-value">{stat.count}</div>
                </div>
              ))}
            </div>

            <div className="stats-grid" style={{ marginTop: '1rem' }}>
              {summary.type_stats.map(stat => (
                <div key={stat.type} className="stat-card">
                  <div className="stat-label">{stat.type}</div>
                  <div className="stat-value">{stat.count}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-title">
                🔥 投诉热点区域 TOP 10
              </div>
              {summary.hotspots.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>地点</th>
                      <th>行政区</th>
                      <th>投诉数量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.hotspots.map((spot, idx) => (
                      <tr key={spot.standard_name}>
                        <td>
                          <span className={`tag ${idx < 3 ? 'tag-warning' : 'tag-info'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td>{spot.standard_name}</td>
                        <td>{spot.district}</td>
                        <td>
                          <strong style={{ color: idx < 3 ? '#dc2626' : '#374151' }}>
                            {spot.count}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  暂无数据
                </div>
              )}
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-title">
                重复投诉统计
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">正常投诉</div>
                  <div className="stat-value" style={{ color: '#059669' }}>
                    {summary.duplicate_stats.normal}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">重复投诉</div>
                  <div className="stat-value" style={{ color: '#dc2626' }}>
                    {summary.duplicate_stats.duplicate}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">重复率</div>
                  <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                    {summary.duplicate_stats.normal + summary.duplicate_stats.duplicate > 0 
                      ? ((summary.duplicate_stats.duplicate / (summary.duplicate_stats.normal + summary.duplicate_stats.duplicate)) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">导出设置</div>
        
        <div className="info-grid">
          <div className="info-item">
            <label>导出格式</label>
            <select 
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
            >
              <option value="json">JSON 格式</option>
              <option value="csv">CSV 格式</option>
            </select>
          </div>
          <div className="info-item">
            <label>状态筛选</label>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
            >
              <option value="">全部状态</option>
              <option value="pending">待复核</option>
              <option value="reviewing">复核中</option>
              <option value="resolved">已解决</option>
              <option value="rejected">已驳回</option>
              <option value="duplicate">重复投诉</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            className="btn btn-primary btn-lg"
            onClick={handleExport}
            disabled={loading}
            style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
              导出中...</>
            ) : (
              '📤 导出数据'
            )}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">导出内容说明</div>
        <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.8' }}>
          <p>导出文件包含以下字段：</p>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>投诉编号、原始地点、标准地点、地点别名</li>
            <li>投诉类型、状态、是否重复、重复关联投诉</li>
            <li>描述、照片数量、备注数量</li>
            <li>上报时间、上报人、创建时间</li>
            <li style={{ color: '#6b7280' }}>（JSON格式额外包含：照片列表、备注列表、版本历史、复核记录）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ExportPage;
