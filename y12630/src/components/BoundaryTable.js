import { useState } from 'react';
import { Eye, Search, ChevronUp, ChevronDown, Filter, ArrowUpDown } from 'lucide-react';

const BoundaryTable = ({
  records,
  onViewDetail,
  onRowClick,
  highlightedRowId,
  showFilters = true,
  showSourceInfo = true
}) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('rowNumber');
  const [sortOrder, setSortOrder] = useState('asc');

  const getStatusBadge = (status) => {
    const statusConfig = {
      success: { text: '✓ 顺利通过', subText: '可直接使用', className: 'success' },
      pending: { text: '? 待确认', subText: '需康复训练师复核', className: 'pending' },
      error: { text: '✗ 数据异常', subText: '不可用', className: 'error' }
    };
    const config = statusConfig[status] || { text: status, subText: '', className: 'pending' };
    return (
      <div>
        <span className={`status-badge ${config.className}`}>{config.text}</span>
        {config.subText && (
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>{config.subText}</div>
        )}
      </div>
    );
  };

  const getRowClass = (record) => {
    let cls = '';
    if (record.status === 'error') cls += ' row-error ';
    if (highlightedRowId === record.id) cls += ' row-highlighted ';
    return cls;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} style={{ opacity: 0.5 }} />;
    return sortOrder === 'asc'
      ? <ChevronUp size={14} />
      : <ChevronDown size={14} />;
  };

  let filtered = [...records];

  if (statusFilter !== 'all') {
    filtered = filtered.filter(r => r.status === statusFilter);
  }

  if (searchText && searchText.trim()) {
    const keyword = searchText.trim().toLowerCase();
    filtered = filtered.filter(r =>
      r.fieldName.toLowerCase().includes(keyword) ||
      r.sourceFile.toLowerCase().includes(keyword) ||
      (r.imageName && r.imageName.toLowerCase().includes(keyword)) ||
      String(r.rowNumber).includes(keyword) ||
      r.operator.toLowerCase().includes(keyword) ||
      (r.sourceNote && r.sourceNote.toLowerCase().includes(keyword))
    );
  }

  filtered.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'rowNumber':
        valA = a.rowNumber; valB = b.rowNumber; break;
      case 'matchRate':
        valA = a.hitDetection?.matchRate || 0; valB = b.hitDetection?.matchRate || 0; break;
      case 'deviation':
        valA = a.hitDetection?.deviation || 0; valB = b.hitDetection?.deviation || 0; break;
      case 'area':
        valA = a.area || 0; valB = b.area || 0; break;
      case 'createdAt':
        valA = a.createdAt; valB = b.createdAt; break;
      default:
        valA = a.rowNumber; valB = b.rowNumber;
    }
    if (sortOrder === 'asc') {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    }
    return valA < valB ? 1 : valA > valB ? -1 : 0;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>检测记录明细 <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>（共 {filtered.length} 条）</span></h2>
      </div>

      {showFilters && (
        <div className="filter-bar">
          <div className="filter-item">
            <Filter size={14} />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">全部状态</option>
              <option value="success">✓ 顺利通过（可直接使用）</option>
              <option value="pending">? 待确认（需复核）</option>
              <option value="error">✗ 数据异常（不可用）</option>
            </select>
          </div>

          <div className="filter-item search-item">
            <Search size={14} />
            <input
              type="text"
              className="search-input"
              placeholder="搜索地块名/来源/行号/操作人..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="panel-body table-wrapper">
        <table>
          <thead>
            <tr>
              <th
                className="sortable-header"
                onClick={() => handleSort('rowNumber')}
                style={{ cursor: 'pointer' }}
              >
                行号 <SortIcon field="rowNumber" />
              </th>
              <th>地块名称</th>
              {showSourceInfo && (
                <>
                  <th>来源文件</th>
                  <th>图片名</th>
                </>
              )}
              <th
                className="sortable-header"
                onClick={() => handleSort('matchRate')}
                style={{ cursor: 'pointer' }}
              >
                匹配率 <SortIcon field="matchRate" />
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort('deviation')}
                style={{ cursor: 'pointer' }}
              >
                偏差 <SortIcon field="deviation" />
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort('area')}
                style={{ cursor: 'pointer' }}
              >
                面积(亩) <SortIcon field="area" />
              </th>
              <th>状态</th>
              <th>操作人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={showSourceInfo ? 10 : 8} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  暂无符合条件的记录
                </td>
              </tr>
            ) : (
              filtered.map(record => (
                <tr
                  key={record.id}
                  className={getRowClass(record)}
                  onClick={() => onRowClick && onRowClick(record)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  id={`row-${record.id}`}
                >
                  <td>
                    <span
                      className="row-number"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick && onRowClick(record);
                      }}
                      title={`原始行号 ${record.rowNumber}，点击查看`}
                    >
                      {record.rowNumber}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{record.fieldName}</div>
                    {record.sourceNote && (
                      <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>
                        {record.sourceNote}
                      </div>
                    )}
                  </td>
                  {showSourceInfo && (
                    <>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {record.sourceFile}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {record.imageName || '-'}
                      </td>
                    </>
                  )}
                  <td style={{
                    fontWeight: 600,
                    color: record.hitDetection?.status === 'success' ? '#166534'
                      : record.hitDetection?.status === 'pending' ? '#92400e'
                      : '#991b1b'
                  }}>
                    {record.hitDetection?.matchRate ?? '-'}%
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>
                    {record.hitDetection?.deviation ?? '-'}
                  </td>
                  <td>{record.area}</td>
                  <td>{getStatusBadge(record.status)}</td>
                  <td>{record.operator}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail(record);
                      }}
                    >
                      <Eye size={16} />
                      详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BoundaryTable;
