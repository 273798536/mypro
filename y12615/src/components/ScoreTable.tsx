import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { STATUS_LABELS, STATUS_COLORS, ReviewStatus } from '../types';

interface ScoreTableProps {
  onRecordClick: (id: string) => void;
}

export default function ScoreTable({ onRecordClick }: ScoreTableProps) {
  const { scoreRecords, updateRecordStatus, selectedRecordId } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAnomaly, setFilterAnomaly] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  const filteredRecords = scoreRecords.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterAnomaly === 'has' && !r.hasAnomaly) return false;
    if (filterAnomaly === 'no' && r.hasAnomaly) return false;
    if (searchText && !r.deviceName.includes(searchText) && !r.source.imageName?.includes(searchText)) {
      return false;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-white border-b flex items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="搜索装置名称或图片名..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="px-3 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部状态</option>
          <option value="approved">{STATUS_LABELS.approved}</option>
          <option value="pending">{STATUS_LABELS.pending}</option>
          <option value="review_needed">{STATUS_LABELS.review_needed}</option>
          <option value="rejected">{STATUS_LABELS.rejected}</option>
        </select>

        <select
          value={filterAnomaly}
          onChange={e => setFilterAnomaly(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部异常</option>
          <option value="has">有异常</option>
          <option value="no">无异常</option>
        </select>

        <span className="text-sm text-gray-500">
          共 {filteredRecords.length} 条记录
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                原始行号
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                装置名称
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                类别
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                颜色
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                得分
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                异常
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                处理人
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                图片名
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                备注
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRecords.map(record => (
              <tr
                key={record.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedRecordId === record.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => onRecordClick(record.id)}
              >
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {record.source.rowNumber}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {record.deviceName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {record.category}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: record.colorCode }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={record.score >= 80 ? 'text-green-600' : record.score >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                    {record.score}/{record.maxScore}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${STATUS_COLORS[record.status]}`}>
                    {STATUS_LABELS[record.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {record.hasAnomaly ? (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                      有异常
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      正常
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {record.handler}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                  {record.source.imageName || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                  {record.source.remark || '-'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={record.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateRecordStatus(record.id, e.target.value as ReviewStatus);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs px-2 py-1 border rounded focus:outline-none"
                  >
                    <option value="approved">通过</option>
                    <option value="pending">待确认</option>
                    <option value="review_needed">需复核</option>
                    <option value="rejected">驳回</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无符合条件的记录
          </div>
        )}
      </div>
    </div>
  );
}
