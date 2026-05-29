import React from 'react';
import { Search, RefreshCw, RotateCcw, Download, Filter } from 'lucide-react';
import { useWarningStore } from '../store/warningStore';
import type { WarningType, WarningLevel, WarningStatus } from '../../shared/types';

const typeOptions = [
  { value: '', label: '全部类型' },
  { value: 'quality_downgrade', label: '质检降级' },
  { value: 'duplicate_receipt', label: '重复仓单' },
  { value: 'price_gap', label: '价格缺口' },
  { value: 'normal', label: '正常' }
];

const levelOptions = [
  { value: '', label: '全部等级' },
  { value: 'high', label: '高风险' },
  { value: 'medium', label: '中风险' },
  { value: 'low', label: '低风险' }
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待复核' },
  { value: 'reviewing', label: '复核中' },
  { value: 'confirmed', label: '确认风险' },
  { value: 'dismissed', label: '排除风险' },
  { value: 'pending_info', label: '待补充材料' }
];

export default function FilterBar() {
  const { filter, setFilter, resetFilter, refreshWarnings, isLoading } = useWarningStore();

  const handleExport = () => {
    window.open('/api/export/warnings', '_blank');
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          筛选条件
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshWarnings()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新数据
          </button>
          <button
            onClick={resetFilter}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置筛选
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出Excel
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">预警类型</label>
          <select
            value={filter.type || ''}
            onChange={(e) => setFilter({ type: e.target.value as WarningType || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">预警等级</label>
          <select
            value={filter.level || ''}
            onChange={(e) => setFilter({ level: e.target.value as WarningLevel || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {levelOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">处理状态</label>
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ status: e.target.value as WarningStatus || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">仓单编号</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filter.receiptNo || ''}
              onChange={(e) => setFilter({ receiptNo: e.target.value })}
              placeholder="输入仓单编号..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">客户名称</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filter.customerName || ''}
              onChange={(e) => setFilter({ customerName: e.target.value })}
              placeholder="输入客户名称..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={filter.startDate || ''}
              onChange={(e) => setFilter({ startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={filter.endDate || ''}
              onChange={(e) => setFilter({ endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
