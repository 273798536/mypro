import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckSquare, Square } from 'lucide-react';
import { useWarningStore } from '../store/warningStore';
import { typeLabels, typeColors, levelColors, statusLabels, statusColors, formatMoney, formatDateTime } from '../utils/format';

export default function WarningTable() {
  const navigate = useNavigate();
  const { warnings, total, isLoading, selectedIds, toggleSelect, selectAll, clearSelection } = useWarningStore();

  const allSelected = warnings.length > 0 && warnings.every(w => selectedIds.includes(w.id));

  if (isLoading && warnings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => allSelected ? clearSelection() : selectAll(warnings.map(w => w.id))}
                className="text-gray-400 hover:text-gray-600"
              >
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">预警编号</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">类型</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">等级</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">仓单编号</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">客户名称</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">货物</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">风险敞口</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">预警时间</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {warnings.map((warning, index) => (
            <tr
              key={warning.id}
              className={`hover:bg-blue-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              onClick={() => navigate(`/warnings/${warning.id}`)}
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleSelect(warning.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {selectedIds.includes(warning.id) ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </td>
              <td className="px-4 py-3 font-mono text-gray-900">{warning.id}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${typeColors[warning.type]}`}>
                  {typeLabels[warning.type]}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${levelColors[warning.level]}`}></span>
                  <span className="text-gray-700">{warning.level === 'high' ? '高' : warning.level === 'medium' ? '中' : '低'}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700 font-mono">{warning.receiptNo}</td>
              <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate">{warning.customerName}</td>
              <td className="px-4 py-3 text-gray-700">{warning.goodsName}</td>
              <td className="px-4 py-3 text-red-600 font-medium">¥{formatMoney(warning.riskAmount)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusColors[warning.status]}`}>
                  {statusLabels[warning.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">{formatDateTime(warning.warningTime)}</td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/warnings/${warning.id}`)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  详情
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {warnings.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          暂无预警数据
        </div>
      )}
      
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-500">共 {total} 条记录</span>
        {selectedIds.length > 0 && (
          <span className="text-sm text-blue-600">已选择 {selectedIds.length} 条</span>
        )}
      </div>
    </div>
  );
}
