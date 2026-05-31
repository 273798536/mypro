import { useState } from 'react';
import { useAppStore } from '../store';
import { Download, FileText, Calendar, FileBarChart, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { generateMonthlyReport, exportResultToCSV } from '../services/export';
import { StatusBadge } from '../components/ui/StatusBadge';

export function Reports() {
  const { calculationResults, nozzles, pressureRecords } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const pendingCount = calculationResults.filter(r => r.status === 'pending').length;
  const blockedCount = calculationResults.filter(r => r.status === 'blocked').length;
  const normalCount = calculationResults.filter(r => r.status === 'normal').length;

  const monthlyResults = calculationResults.filter(r => {
    const resultDate = new Date(r.createdAt);
    const resultMonth = `${resultDate.getFullYear()}-${String(resultDate.getMonth() + 1).padStart(2, '0')}`;
    return resultMonth === selectedMonth;
  });

  const handleGeneratePDF = () => {
    setIsGenerating(true);
    try {
      const fileName = generateMonthlyReport(monthlyResults, nozzles, pressureRecords, selectedMonth);
      setExportSuccess(`已生成报告: ${fileName}`);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error) {
      console.error('生成报告失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    setIsGenerating(true);
    try {
      const fileName = exportResultToCSV(calculationResults, nozzles, pressureRecords);
      setExportSuccess(`已导出: ${fileName}`);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">报告导出</h1>
        <p className="text-slate-500 mt-1">生成月度报告和导出试算数据</p>
      </div>

      {exportSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="text-green-500" size={20} />
          <span className="text-green-700">{exportSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileBarChart className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">总试算次数</p>
              <p className="text-2xl font-bold text-slate-900">{calculationResults.length}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">正常</span>
              <span className="font-medium text-green-600">{normalCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">待确认</span>
              <span className="font-medium text-amber-600">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">堵塞预警</span>
              <span className="font-medium text-red-600">{blockedCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">选择月份</p>
              <p className="text-2xl font-bold text-slate-900">{selectedMonth}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">本月试算</span>
              <span className="font-medium text-slate-900">{monthlyResults.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">本月待确认</span>
              <span className="font-medium text-amber-600">
                {monthlyResults.filter(r => r.status === 'pending').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <FileText className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">报告类型</p>
              <p className="font-semibold text-slate-900">月度汇总报告</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-slate-500">
            <p>• 包含完整雾化参数统计</p>
            <p>• 压力越界情况分析</p>
            <p>• 喷嘴状态汇总</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-4">导出选项</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="p-5 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">月度PDF报告</h3>
                  <p className="text-sm text-slate-500">生成月度雾化试算汇总报告</p>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-2">选择月份</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <button
                onClick={handleGeneratePDF}
                disabled={isGenerating || monthlyResults.length === 0}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                {isGenerating ? '生成中...' : '生成PDF报告'}
              </button>
            </div>

            <div className="p-5 border border-slate-200 rounded-xl hover:border-green-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-green-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">CSV数据导出</h3>
                  <p className="text-sm text-slate-500">导出全部试算结果数据表</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p>• 包含所有历史记录</p>
                <p>• 可用于Excel分析</p>
                <p>• 共 {calculationResults.length} 条记录</p>
              </div>
              <button
                onClick={handleExportCSV}
                disabled={isGenerating || calculationResults.length === 0}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                {isGenerating ? '导出中...' : '导出CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">待处理事项提醒</h2>
        </div>
        <div className="p-6">
          {pendingCount === 0 && blockedCount === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-green-400 mb-3" size={48} />
              <p className="text-slate-500">暂无待处理事项</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCount > 0 && (
                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-amber-500" size={24} />
                    <div>
                      <p className="font-medium text-amber-700">压力越界待确认</p>
                      <p className="text-sm text-amber-600">{pendingCount} 条记录需要技术主管核审</p>
                    </div>
                  </div>
                  <StatusBadge type="pending">{pendingCount} 条</StatusBadge>
                </div>
              )}
              {blockedCount > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="text-red-500" size={24} />
                    <div>
                      <p className="font-medium text-red-700">喷嘴堵塞预警</p>
                      <p className="text-sm text-red-600">{blockedCount} 个喷嘴疑似需要检查</p>
                    </div>
                  </div>
                  <StatusBadge type="error">{blockedCount} 条</StatusBadge>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
