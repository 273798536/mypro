import { useState, useMemo } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  File,
  Calendar,
  Building2,
  GitBranch,
  AlertCircle
} from 'lucide-react';
import { useValuationStore } from '@/store/valuationStore';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import { dataSourceLabels } from '@/data/mockData';

type ExportFormat = 'pdf' | 'excel' | 'word';

export default function ExportPage() {
  const { getFilteredValuations, valuationLogs, conflicts, filters } = useValuationStore();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [includeChanges, setIncludeChanges] = useState(true);
  const [includeConflicts, setIncludeConflicts] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const filteredValuations = getFilteredValuations();
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

  const exportSummary = useMemo(() => {
    const totalAmount = filteredValuations.reduce((sum, v) => sum + v.valuationAmount, 0);
    const projectCount = new Set(filteredValuations.map((v) => v.projectId)).size;
    const manualCount = filteredValuations.filter((v) => v.isManual).length;
    const changeCount = valuationLogs.filter((log) => {
      const valuationIds = filteredValuations.map((v) => v.valuationId);
      return valuationIds.includes(log.valuationId);
    }).length;

    return {
      totalAmount,
      projectCount,
      recordCount: filteredValuations.length,
      manualCount,
      changeCount,
      conflictCount: unresolvedConflicts.length,
    };
  }, [filteredValuations, valuationLogs, unresolvedConflicts]);

  const handleExport = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      setIsGenerating(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }, 1500);
  };

  const formatOptions = [
    { value: 'pdf', label: 'PDF 文档', icon: FileText, description: '适合打印和存档' },
    { value: 'excel', label: 'Excel 表格', icon: FileSpreadsheet, description: '适合数据分析' },
    { value: 'word', label: 'Word 文档', icon: File, description: '适合编辑和审阅' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">导出中心</h1>
        <p className="text-slate-500 mt-1">生成估值备忘报告，自动嵌入变更说明和冲突记录</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">导出内容概览</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600">项目数</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{exportSummary.projectCount}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-600">估值记录</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{exportSummary.recordCount}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-600">变更记录</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{exportSummary.changeCount}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">估值总金额</span>
                <span className="font-semibold text-slate-800">{formatCurrency(exportSummary.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">人工修正记录</span>
                <span className="font-semibold text-slate-800">{exportSummary.manualCount} 条</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600">待解决冲突</span>
                <span className={`font-semibold ${exportSummary.conflictCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {exportSummary.conflictCount} 项
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">当前筛选条件</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">日期范围：</span>
                <span className="text-sm font-medium text-slate-800">
                  {formatDate(filters.dateRange.start)} - {formatDate(filters.dateRange.end)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">基金筛选：</span>
                <span className="text-sm font-medium text-slate-800">
                  {filters.fundNames.length > 0 ? filters.fundNames.join('、') : '全部基金'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">数据来源：</span>
                <span className="text-sm font-medium text-slate-800">
                  {filters.dataSources.length > 0 
                    ? filters.dataSources.map((s) => dataSourceLabels[s]).join('、') 
                    : '全部来源'}
                </span>
              </div>
            </div>
          </div>

          {includeConflicts && unresolvedConflicts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">包含未解决冲突</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    导出的报告中将包含 {unresolvedConflicts.length} 项未解决的冲突记录，
                    请在导出前确认是否需要先处理这些问题。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">选择导出格式</h3>
            <div className="space-y-3">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedFormat === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedFormat(option.value as ExportFormat)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-primary-100' : 'bg-slate-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          isSelected ? 'text-primary-600' : 'text-slate-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          isSelected ? 'text-primary-700' : 'text-slate-800'
                        }`}>
                          {option.label}
                        </p>
                        <p className="text-sm text-slate-500">{option.description}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-primary-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">导出选项</h3>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeChanges}
                  onChange={(e) => setIncludeChanges(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-slate-800">包含变更说明</p>
                  <p className="text-sm text-slate-500">在报告中附加入工修改记录和原因说明</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeConflicts}
                  onChange={(e) => setIncludeConflicts(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-slate-800">包含冲突记录</p>
                  <p className="text-sm text-slate-500">在报告中列出所有数据冲突及其状态</p>
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isGenerating || filteredValuations.length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                正在生成...
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                导出成功
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                导出估值备忘
              </>
            )}
          </button>

          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">导出内容包括</h4>
            <ul className="text-sm text-slate-500 space-y-1">
              <li>• 估值汇总表（含筛选条件）</li>
              <li>• 各项目估值明细</li>
              {includeChanges && <li>• 人工变更历史及原因</li>}
              {includeConflicts && <li>• 数据冲突记录清单</li>}
              <li>• 导出时间和操作人</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
