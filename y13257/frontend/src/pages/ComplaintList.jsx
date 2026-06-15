import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsAPI, exportAPI } from '../api';
import { statusMap, typeMap, formatDate, truncate } from '../utils';

function ComplaintList() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({
    status: '',
    is_duplicate: '',
    complaint_type: ''
  });

  useEffect(() => {
    loadData();
    loadStats();
  }, [filters, pagination.page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { ...filters, page: pagination.page, page_size: pagination.page_size };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === undefined) delete params[key];
      });
      const res = await complaintsAPI.getList(params);
      setComplaints(res.data.list);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('加载投诉列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await exportAPI.getSummary();
      setStats(res.data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading && complaints.length === 0) {
    return <div className="loading"><div className="spinner"></div>加载中...</div>;
  }

  return (
    <div>
      <div className="page-title">
        投诉列表
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/export')}
        >
          📤 导出数据
        </button>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">待复核</div>
            <div className="stat-value">{stats.status_stats.find(s => s.status === '待复核')?.count || 0}</div>
            <div className="stat-change up">需要处理</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">复核中</div>
            <div className="stat-value">{stats.status_stats.find(s => s.status === '复核中')?.count || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">已解决</div>
            <div className="stat-value">{stats.status_stats.find(s => s.status === '已解决')?.count || 0}</div>
            <div className="stat-change up">已处理完成</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">重复投诉</div>
            <div className="stat-value">{stats.duplicate_stats.duplicate}</div>
            <div className="stat-change down">已合并处理</div>
          </div>
        </div>
      )}

      <div className="filters">
        <div className="filter-group">
          <label>状态</label>
          <select 
            value={filters.status} 
            onChange={e => handleFilterChange('status', e.target.value)}
          >
            <option value="">全部</option>
            <option value="pending">待复核</option>
            <option value="reviewing">复核中</option>
            <option value="resolved">已解决</option>
            <option value="rejected">已驳回</option>
            <option value="duplicate">重复投诉</option>
          </select>
        </div>
        <div className="filter-group">
          <label>投诉类型</label>
          <select 
            value={filters.complaint_type} 
            onChange={e => handleFilterChange('complaint_type', e.target.value)}
          >
            <option value="">全部</option>
            <option value="illegal_parking">违停</option>
            <option value="traffic_congestion">拥堵</option>
            <option value="pedestrian_safety">行人安全</option>
          </select>
        </div>
        <div className="filter-group">
          <label>重复投诉</label>
          <select 
            value={filters.is_duplicate} 
            onChange={e => handleFilterChange('is_duplicate', e.target.value)}
          >
            <option value="">全部</option>
            <option value="true">仅显示重复</option>
            <option value="false">排除重复</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>投诉编号</th>
              <th>原始地点</th>
              <th>标准地点</th>
              <th>类型</th>
              <th>状态</th>
              <th>描述</th>
              <th>照片</th>
              <th>上报时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map(complaint => (
              <tr key={complaint.id}>
                <td>
                  <strong>{complaint.complaint_no}</strong>
                  {complaint.is_duplicate && (
                    <span className="duplicate-badge">重复</span>
                  )}
                </td>
                <td>
                  <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '0.85rem' }}>
                    {complaint.original_location_text}
                  </span>
                </td>
                <td>
                  {complaint.standard_name || (
                    <span style={{ color: '#ef4444' }}>未匹配</span>
                  )}
                </td>
                <td>
                  <span className="tag tag-info">
                    {typeMap[complaint.complaint_type] || complaint.complaint_type}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${statusMap[complaint.status]?.class}`}>
                    {statusMap[complaint.status]?.text}
                  </span>
                  {complaint.duplicate_of_no && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>
                      关联: {complaint.duplicate_of_no}
                    </div>
                  )}
                </td>
                <td>{truncate(complaint.description, 40)}</td>
                <td>
                  <span className="tag tag-info">📷 {complaint.photo_count}</span>
                  {complaint.note_count > 0 && (
                    <span className="tag tag-warning">📝 {complaint.note_count}</span>
                  )}
                </td>
                <td>{formatDate(complaint.reported_at)}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/complaints/${complaint.id}`)}
                  >
                    复核
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {complaints.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div>暂无投诉记录</div>
          </div>
        )}

        {pagination.total_pages > 1 && (
          <div className="pagination">
            <button 
              disabled={pagination.page === 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              上一页
            </button>
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={pagination.page === page ? 'active' : ''}
                onClick={() => setPagination(p => ({ ...p, page }))}
              >
                {page}
              </button>
            ))}
            <button 
              disabled={pagination.page === pagination.total_pages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComplaintList;
