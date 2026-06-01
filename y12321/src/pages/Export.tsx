import { useState, useMemo } from 'react';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson,
  CheckCircle,
  AlertTriangle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles
} from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { ExportOptions } from '../types';
import { cn } from '../lib/utils';
import { exportToCSV, exportToJSON, exportToMarkdown, downloadFile, generateExportFilename } from '../utils/exportUtils';

export default function Export() {
  const { records, auditLogs } = useAnalysisStore();
  
  const [options, setOptions] = useState<ExportOptions>({
    includeNormal: true,
    includePending: true,
    includeAbnormal: true,
    includeEvidence: true,
    includeAudit: true,
    format: 'markdown',
  });
  
  const [expandedPreview, setExpandedPreview] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const normalRecords = records.filter(r => r.status === 'normal');
  const pendingRecords = records.filter(r => r.status === 'pending');
  const abnormalRecords = records.filter(r => r.status === 'abnormal');
  const modifiedRecords = records.filter(r => r.lagModified);

  const exportCount = useMemo(() => {
    let count = 0;
    if (options.includeNormal) count += normalRecords.length;
    if (options.includePending) count += pendingRecords.length;
    if (options.includeAbnormal) count += abnormalRecords.length;
    return count;
  }, [options, normalRecords, pendingRecords, abnormalRecords]);

  const formatOptions = [
    { id: 'markdown' as const, label: 'Markdown', icon: FileText, desc: '适合文档和报告' },
    { id: 'csv' as const, label: 'CSV', icon: FileSpreadsheet, desc: '适合Excel分析' },
    { id: 'json' as const, label: 'JSON', icon: FileJson, desc: '适合程序处理' },
  ];

  const handleExport = () => {
    if (exportCount === 0) {
      alert('请至少选择一种类型的记录进行导出');
      return;
    }

    setIsGenerating(true);
    
    setTimeout(() => {
      let content = '';
      let mimeType = '';
      
      switch (options.format) {
        case 'csv':
          content = exportToCSV(records, auditLogs, options);
          mimeType = 'text/csv;charset=utf-8';
          break;
        case 'json':
          content = exportToJSON(records, auditLogs, options);
          mimeType = 'application/json;charset=utf-8';
          break;
        case 'markdown':
          content = exportToMarkdown(records, auditLogs, options);
          mimeType = 'text/markdown;charset=utf-8';
          break;
      }
      
      const filename = generateExportFilename(options.format);
      downloadFile(content, filename, mimeType);
      setIsGenerating(false);
    }, 800);
  };

  const toggleOption = (key: keyof ExportOptions) => {
    if (typeof options[key] === 'boolean') {
      setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const setFormat = (format: ExportOptions['format']) => {
    setOptions(prev => ({ ...prev, format }));
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Download className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">报告导出</h1>
        </div>
        <p className="text-slate-400">导出正常结果和算不了的原因，可选择是否包含改动痕迹</p>
      </div>

      {modifiedRecords.length > 0 && (
        <div className="mb-6 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
          <p className="text-sm text-purple-400 flex items-start gap-2">
            <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>
              有 <strong>{modifiedRecords.length}</strong> 条记录的滞后检查已被人工修改。
              导出报告中这些记录会标注 <span className="font-mono">*</span> 号，
              并在改动审计日志中详细记录。
              {options.includeAudit ? (
                <span className="text-emerald-400 ml-1">（已包含改动审计）</span>
              ) : (
                <span className="text-amber-400 ml-1">（当前未包含改动审计，建议勾选）</span>
              )}
            </span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">导出内容</h2>
            
            <div className="space-y-3">
              <div 
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all',
                  options.includeNormal 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : 'border-slate-700 bg-slate-800/30 opacity-60'
                )}
                onClick={() => toggleOption('includeNormal')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    options.includeNormal 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'border-slate-600'
                  )}>
                    {options.includeNormal && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-white font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      正常明细
                    </p>
                    <p className="text-xs text-slate-400">通过所有误判检测的记录</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-emerald-400 font-mono">
                  {normalRecords.length}
                </span>
              </div>

              <div 
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all',
                  options.includePending 
                    ? 'border-amber-500/30 bg-amber-500/5' 
                    : 'border-slate-700 bg-slate-800/30 opacity-60'
                )}
                onClick={() => toggleOption('includePending')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    options.includePending 
                      ? 'bg-amber-500 border-amber-500' 
                      : 'border-slate-600'
                  )}>
                    {options.includePending && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-white font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      待确认
                    </p>
                    <p className="text-xs text-slate-400">存在滞后关系、共同趋势等情况</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-400 font-mono">
                  {pendingRecords.length}
                </span>
              </div>

              <div 
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all',
                  options.includeAbnormal 
                    ? 'border-red-500/30 bg-red-500/5' 
                    : 'border-slate-700 bg-slate-800/30 opacity-60'
                )}
                onClick={() => toggleOption('includeAbnormal')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    options.includeAbnormal 
                      ? 'bg-red-500 border-red-500' 
                      : 'border-slate-600'
                  )}>
                    {options.includeAbnormal && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-white font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      异常（算不了的原因）
                    </p>
                    <p className="text-xs text-slate-400">样本太少、数据缺失等无法计算的记录</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-red-400 font-mono">
                  {abnormalRecords.length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">附加选项</h2>
            
            <div className="space-y-3">
              <div 
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all',
                  options.includeEvidence 
                    ? 'border-blue-500/30 bg-blue-500/5' 
                    : 'border-slate-700 bg-slate-800/30 opacity-60'
                )}
                onClick={() => toggleOption('includeEvidence')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    options.includeEvidence 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-slate-600'
                  )}>
                    {options.includeEvidence && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-white font-medium">包含证据链</p>
                    <p className="text-xs text-slate-400">来源、判断、结果的完整追踪记录</p>
                  </div>
                </div>
                <AlertCircle className="w-4 h-4 text-blue-400" />
              </div>

              <div 
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all',
                  options.includeAudit 
                    ? 'border-purple-500/30 bg-purple-500/5' 
                    : 'border-slate-700 bg-slate-800/30 opacity-60'
                )}
                onClick={() => toggleOption('includeAudit')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    options.includeAudit 
                      ? 'bg-purple-500 border-purple-500' 
                      : 'border-slate-600'
                  )}>
                    {options.includeAudit && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-white font-medium">包含改动审计日志</p>
                    <p className="text-xs text-slate-400">人工修改滞后检查的记录（含改动影响）</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-purple-400 font-mono">
                    {auditLogs.length}
                  </span>
                  <p className="text-xs text-slate-500">条改动</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">导出格式</h2>
            
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setFormat(format.id)}
                  className={cn(
                    'p-4 rounded-lg border transition-all text-left',
                    options.format === format.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                  )}
                >
                  <format.icon className={cn(
                    'w-6 h-6 mb-2',
                    options.format === format.id ? 'text-blue-400' : 'text-slate-400'
                  )} />
                  <p className={cn(
                    'font-medium',
                    options.format === format.id ? 'text-white' : 'text-slate-300'
                  )}>
                    {format.label}
                  </p>
                  <p className="text-xs text-slate-500">{format.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">导出概览</h2>
              <button
                onClick={() => setExpandedPreview(!expandedPreview)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                {expandedPreview ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {expandedPreview && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">将导出记录</p>
                      <p className="text-2xl font-bold text-white font-mono">{exportCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">导出格式</p>
                      <p className="text-lg font-bold text-blue-400">{options.format.toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {options.includeNormal && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span>正常明细</span>
                      <span className="text-emerald-400 font-mono">{normalRecords.length} 条</span>
                    </div>
                  )}
                  {options.includePending && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span>待确认</span>
                      <span className="text-amber-400 font-mono">{pendingRecords.length} 条</span>
                    </div>
                  )}
                  {options.includeAbnormal && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span>异常（算不了的原因）</span>
                      <span className="text-red-400 font-mono">{abnormalRecords.length} 条</span>
                    </div>
                  )}
                  {options.includeEvidence && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span>证据链</span>
                      <span className="text-blue-400">已包含</span>
                    </div>
                  )}
                  {options.includeAudit && auditLogs.length > 0 && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span>改动审计日志</span>
                      <span className="text-purple-400 font-mono">{auditLogs.length} 条</span>
                    </div>
                  )}
                  {modifiedRecords.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <p className="text-xs text-purple-400">
                        ⚠️ 其中 {modifiedRecords.length} 条记录标注 * 号（滞后检查已人工修改）
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExport}
                  disabled={exportCount === 0 || isGenerating}
                  className={cn(
                    'w-full py-3 rounded-md font-medium transition-all inline-flex items-center justify-center gap-2',
                    exportCount === 0 || isGenerating
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  )}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      导出报告
                    </>
                  )}
                </button>

                {exportCount === 0 && (
                  <p className="text-xs text-center text-slate-500">
                    请至少选择一种类型的记录
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-white mb-3">导出内容说明</h3>
            <div className="space-y-2 text-xs text-slate-400">
              <p>• <strong className="text-slate-300">正常明细</strong>：通过所有误判检测的相关性分析结果</p>
              <p>• <strong className="text-slate-300">待确认</strong>：存在滞后关系、共同趋势等，需人工确认</p>
              <p>• <strong className="text-slate-300">异常</strong>：样本太少（&lt;30）、数据缺失等无法得出可靠结论</p>
              <p>• <strong className="text-slate-300">证据链</strong>：数据来源 → 分析判断 → 最终结果的完整追踪</p>
              <p>• <strong className="text-slate-300">改动审计</strong>：人工修改滞后检查的记录，包含修改前后对比</p>
              <p className="text-purple-400 pt-2 border-t border-slate-700 mt-3">
                💡 标注 * 的记录表示其滞后检查经过人工调整，在分组对比时需特别注意
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
