import { useState } from 'react';
import { 
  Download, 
  Calendar, 
  FileText, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle,
  FileSpreadsheet,
  ChevronDown,
  Plus,
  User
} from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { modelVersions } from '../data/mockData';
import type { TicketStatus } from '../types';
import { cn } from '../lib/utils';

export default function Export() {
  const { exportRecords, createExport, filters, setFilters, getFilteredTickets } = useDashboardStore();
  const [showExportForm, setShowExportForm] = useState(false);
  const [exportName, setExportName] = useState('');
  
  const filteredTickets = getFilteredTickets();
  const exportCount = filteredTickets.length;

  const handleCreateExport = () => {
    if (!exportName.trim()) return;
    createExport(exportName, filters);
    setExportName('');
    setShowExportForm(false);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'processing': return <Clock className="text-amber-500 animate-spin" size={16} />;
      case 'failed': return <XCircle className="text-red-500" size={16} />;
      default: return null;
    }
  };

  const StatusText = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed': return <span className="text-green-600">已完成</span>;
      case 'processing': return <span className="text-amber-600">处理中</span>;
      case 'failed': return <span className="text-red-600">失败</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Filter className="text-blue-500" size={20} />
              筛选配置
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              配置筛选条件，预览符合条件的数据后导出
            </p>
          </div>
          <button
            onClick={() => setShowExportForm(!showExportForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus size={16} />
            创建导出
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">开始日期</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="date"
                value={filters.dateRange?.[0] || ''}
                onChange={(e) => {
                  const endDate = filters.dateRange?.[1] || e.target.value;
                  setFilters({ dateRange: [e.target.value, endDate] });
                }}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">结束日期</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="date"
                value={filters.dateRange?.[1] || ''}
                onChange={(e) => {
                  const startDate = filters.dateRange?.[0] || e.target.value;
                  setFilters({ dateRange: [startDate, e.target.value] });
                }}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">模型版本</label>
            <div className="relative">
              <select
                value={filters.modelVersion || ''}
                onChange={(e) => setFilters({ modelVersion: e.target.value || null })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
              >
                <option value="">全部版本</option>
                {modelVersions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">处理状态</label>
            <div className="relative">
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ status: (e.target.value as TicketStatus) || null })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
              >
                <option value="">全部状态</option>
                <option value="pending">待处理</option>
                <option value="processed">已处理</option>
                <option value="need_evidence">需补证据</option>
                <option value="duplicate">重复评测</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="text-blue-500" size={24} />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  当前筛选条件下共有 <span className="font-mono font-bold text-blue-600">{exportCount}</span> 条工单数据
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  包含评测记录 {filteredTickets.flatMap(t => t.evaluations).filter(e => !e.isDuplicate).length} 条（已去重）
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExportForm(true)}
              disabled={exportCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              导出当前数据
            </button>
          </div>
        </div>

        {showExportForm && (
          <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-3">创建导出任务</h4>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">导出名称</label>
                <input
                  type="text"
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  placeholder="请输入导出文件名称"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleCreateExport}
                disabled={!exportName.trim()}
                className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认导出
              </button>
              <button
                onClick={() => {
                  setShowExportForm(false);
                  setExportName('');
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="text-slate-500" size={20} />
            历史导出记录
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            查看和重新下载历史导出文件
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">文件名称</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">筛选条件</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">创建人</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exportRecords.map((record, index) => (
                <tr 
                  key={record.id} 
                  className="hover:bg-slate-50 transition-colors"
                  style={{ animation: `fadeInUp 0.3s ease ${index * 50}ms both` }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <FileSpreadsheet className="text-green-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{record.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{record.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {record.filters.dateRange && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          <Calendar size={10} className="mr-1" />
                          {record.filters.dateRange[0]} ~ {record.filters.dateRange[1]}
                        </span>
                      )}
                      {record.filters.modelVersion && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                          {record.filters.modelVersion}
                        </span>
                      )}
                      {record.filters.status && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                          {record.filters.status === 'processed' && '已处理'}
                          {record.filters.status === 'pending' && '待处理'}
                          {record.filters.status === 'need_evidence' && '需补证据'}
                          {record.filters.status === 'duplicate' && '重复评测'}
                        </span>
                      )}
                      {!record.filters.dateRange && !record.filters.modelVersion && !record.filters.status && (
                        <span className="text-xs text-slate-400">无筛选条件</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-600">{record.createdBy}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {record.createdAt}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={record.status} />
                      <StatusText status={record.status} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {record.status === 'completed' && (
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Download size={14} />
                        重新下载
                      </button>
                    )}
                    {record.status === 'failed' && (
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        重试
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {exportRecords.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">暂无导出记录</p>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">导出使用指南</h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-white" />
                <span><strong>哪里放材料：</strong>在「异常处理」页面的证据材料管理区上传补充证据，系统会自动关联到对应工单</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-white" />
                <span><strong>哪里看异常：</strong>在「指标总览」页面查看重复评测预警，或在「异常处理」页面统一处理</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-white" />
                <span><strong>哪里重新导出：</strong>在本页面配置筛选条件后创建导出，或在历史记录中重新下载</span>
              </li>
            </ul>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center mb-2">
              <Download size={32} />
            </div>
            <p className="text-xs text-blue-100">负责人操作指引</p>
          </div>
        </div>
      </div>
    </div>
  );
}
