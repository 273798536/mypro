import { useState } from 'react';
import { useRebateStore, stores, salesPersons } from '../store/rebateStore';
import { Download, FileSpreadsheet, FileText, Check, Filter, Database } from 'lucide-react';

export default function Export() {
  const { exportReport, getFilteredResults, filters, setFilters, contracts, salesAssignments, transferRecords, refundRecords, ptPackages } = useRebateStore();
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const filteredResults = getFilteredResults();

  const dataSources = [
    { name: '会员合同', count: contracts.length, icon: '📄' },
    { name: '销售归属', count: salesAssignments.length, icon: '👤' },
    { name: '转店记录', count: transferRecords.length, icon: '🔄' },
    { name: '退课流水', count: refundRecords.filter((r) => !r.isRolledBack).length, icon: '↩️' },
    { name: '私教包', count: ptPackages.length, icon: '💪' },
  ];

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      exportReport(exportFormat);
      setExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">报告导出</h1>
          <p className="text-slate-500 mt-1">导出返利报告，包含完整数据来源和版本信息</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">导出配置</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">导出格式</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setExportFormat('xlsx')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    exportFormat === 'xlsx'
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${
                    exportFormat === 'xlsx' ? 'text-[#1e3a5f]' : 'text-slate-400'
                  }`} />
                  <p className={`font-medium text-sm ${
                    exportFormat === 'xlsx' ? 'text-[#1e3a5f]' : 'text-slate-600'
                  }`}>Excel (.xlsx)</p>
                  <p className="text-xs text-slate-500 mt-1">适合数据分析</p>
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    exportFormat === 'csv'
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <FileText className={`w-8 h-8 mx-auto mb-2 ${
                    exportFormat === 'csv' ? 'text-[#1e3a5f]' : 'text-slate-400'
                  }`} />
                  <p className={`font-medium text-sm ${
                    exportFormat === 'csv' ? 'text-[#1e3a5f]' : 'text-slate-600'
                  }`}>CSV (.csv)</p>
                  <p className="text-xs text-slate-500 mt-1">通用文本格式</p>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-500" />
                <label className="block text-sm font-medium text-slate-700">筛选条件</label>
              </div>
              <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">门店</span>
                  <span className="text-slate-700">
                    {filters.storeId ? stores.find((s) => s.id === filters.storeId)?.name : '全部门店'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">销售</span>
                  <span className="text-slate-700">
                    {filters.salesId ? salesPersons.find((s) => s.id === filters.salesId)?.name : '全部销售'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">状态</span>
                  <span className="text-slate-700">
                    {filters.status === 'normal' ? '正常' : filters.status === 'warning' ? '警告' : filters.status === 'disputed' ? '争议' : filters.status === 'confirmed' ? '已确认' : '全部状态'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">日期范围</span>
                  <span className="text-slate-700">
                    {filters.startDate || filters.endDate ? `${filters.startDate || '不限'} 至 ${filters.endDate || '不限'}` : '全部日期'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                如需修改筛选条件，请前往返利概览页面调整
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting || filteredResults.length === 0}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                exporting
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : exportSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#1e3a5f] text-white hover:bg-[#2a4a75]'
              }`}
            >
              {exporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  正在生成报告...
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  导出成功
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  导出 {filteredResults.length} 条记录
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-slate-500" />
              <h2 className="font-semibold text-slate-800">数据来源</h2>
            </div>
            <div className="space-y-3">
              {dataSources.map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{source.icon}</span>
                    <span className="font-medium text-slate-700">{source.name}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-white rounded-full text-sm text-slate-600 shadow-sm">
                    {source.count} 条
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2a4a75] rounded-xl p-6 text-white">
            <h3 className="font-semibold text-lg mb-3">导出内容说明</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <span className="text-white">✓</span>
                包含完整返利计算明细和状态
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white">✓</span>
                标记异常记录和警告信息
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white">✓</span>
                显示数据来源和计算版本
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white">✓</span>
                保留操作人信息和时间戳
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-3">文件名格式</h3>
            <div className="p-3 bg-slate-50 rounded-lg font-mono text-sm text-slate-600">
              返利报告_YYYY-MM-DD.{exportFormat}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              文件将自动下载到您的默认下载目录
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
