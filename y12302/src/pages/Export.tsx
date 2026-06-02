import { useState, useCallback } from 'react';
import { 
  Download, 
  FileText, 
  FileJson, 
  Image, 
  Check,
  AlertTriangle,
  Layers,
  Radiation,
  Calendar,
  User,
  Eye,
  XCircle,
  CheckCircle
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../utils/colorUtils';
import { cn } from '../lib/utils';
import { 
  exportToPDF, 
  exportToHTML, 
  exportToJSON, 
  generateSummary,
  type ExportOptions 
} from '../utils/exportUtils';

export function Export() {
  const { organs, doses, issues, screenshots, notes, addLog } = useAppStore();
  const [exportFormat, setExportFormat] = useState<'pdf' | 'html' | 'json'>('pdf');
  const [includeOrgans, setIncludeOrgans] = useState(true);
  const [includeDoses, setIncludeDoses] = useState(true);
  const [includeIssues, setIncludeIssues] = useState(true);
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const unresolvedIssues = issues.filter((i) => !i.resolved).length;
  const selectedOrgans = organs.filter((o) => o.visible);
  const selectedDoses = doses.filter((d) => d.visible);

  const handleExport = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    setExportSuccess(false);

    const options: ExportOptions = {
      includeOrgans,
      includeDoses,
      includeIssues,
      includeScreenshots,
      includeNotes,
    };

    const exportOrgans = includeOrgans ? organs : [];
    const exportDoses = includeDoses ? doses : [];
    const exportIssues = includeIssues ? issues : [];
    const exportScreenshots = includeScreenshots ? screenshots : [];
    const exportNotes = includeNotes ? notes : [];

    const organIds = exportOrgans.map(o => o.id);
    const doseIds = exportDoses.map(d => d.id);

    try {
      console.log('=== 导出报告开始 ===');
      console.log(`格式: ${exportFormat.toUpperCase()}`);
      console.log(`器官模型: ${exportOrgans.length}个`);
      console.log(`剂量网格: ${exportDoses.length}个`);
      console.log(`检测问题: ${exportIssues.length}个 (未解决: ${unresolvedIssues}个)`);
      console.log(`截图: ${exportScreenshots.length}张`);
      console.log(`备注: ${exportNotes.length}条`);

      const summary = generateSummary(exportOrgans, exportDoses, exportIssues, exportScreenshots, exportNotes);
      console.log('\n报告摘要:');
      console.log(summary);
      console.log('\n====================');

      const progressCallback = (progress: number) => {
        setExportProgress(progress);
      };

      progressCallback(5);

      switch (exportFormat) {
        case 'pdf':
          await exportToPDF(
            exportOrgans,
            exportDoses,
            exportIssues,
            exportScreenshots,
            exportNotes,
            options,
            progressCallback
          );
          break;
        case 'html':
          progressCallback(30);
          exportToHTML(
            exportOrgans,
            exportDoses,
            exportIssues,
            exportScreenshots,
            exportNotes,
            options
          );
          progressCallback(100);
          break;
        case 'json':
          progressCallback(30);
          exportToJSON(
            exportOrgans,
            exportDoses,
            exportIssues,
            exportScreenshots,
            exportNotes,
            options
          );
          progressCallback(100);
          break;
      }

      setExportSuccess(true);
      setExportError(null);

      addLog({
        type: 'export',
        description: `导出${exportFormat.toUpperCase()}报告成功 (${exportOrgans.length}个器官, ${exportDoses.length}个剂量, ${exportIssues.length}个问题)`,
        organIds,
        doseIds,
        userId: 'current-user',
        userName: '当前用户',
        timestamp: new Date(),
      });

      console.log('✓ 导出报告完成');

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('✗ 导出报告失败:', error);
      
      let errorMessage = '导出失败，请重试';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setExportError(errorMessage);
      setIsExporting(false);
      setExportProgress(0);

      addLog({
        type: 'export',
        description: `导出${exportFormat.toUpperCase()}报告失败: ${errorMessage}`,
        organIds,
        doseIds,
        userId: 'current-user',
        userName: '当前用户',
        timestamp: new Date(),
      });

      setTimeout(() => {
        setExportError(null);
      }, 5000);
    }
  }, [exportFormat, includeOrgans, includeDoses, includeIssues, includeScreenshots, includeNotes, organs, doses, issues, screenshots, notes, isExporting, unresolvedIssues, addLog]);

  const generateSummaryText = () => {
    return generateSummary(organs, doses, issues, screenshots, notes);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">报告导出</h1>
          <p className="text-slate-400 text-sm mt-1">导出包含检测结果、截图和剂量数据的完整报告</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 overflow-auto">
        <div className="col-span-2 space-y-6">
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
            <h3 className="font-semibold text-white mb-4">导出格式</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'pdf', label: 'PDF报告', icon: FileText, desc: '适合打印和存档' },
                { id: 'html', label: 'HTML报告', icon: Eye, desc: '交互式网页格式' },
                { id: 'json', label: 'JSON数据', icon: FileJson, desc: '原始数据导出' },
              ].map((format) => (
                <button
                  key={format.id}
                  onClick={() => setExportFormat(format.id as 'pdf' | 'html' | 'json')}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all text-left',
                    exportFormat === format.id
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  )}
                >
                  <format.icon
                    size={24}
                    className={cn(
                      'mb-2',
                      exportFormat === format.id ? 'text-teal-400' : 'text-slate-500'
                    )}
                  />
                  <div className="font-medium text-white">{format.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{format.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
            <h3 className="font-semibold text-white mb-4">导出内容</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={includeOrgans}
                  onChange={(e) => setIncludeOrgans(e.target.checked)}
                  className="mt-1 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                />
                <div>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Layers size={16} className="text-teal-400" />
                    器官模型
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    包含{selectedOrgans.length}个器官的位置、版本和来源信息
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={includeDoses}
                  onChange={(e) => setIncludeDoses(e.target.checked)}
                  className="mt-1 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                />
                <div>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Radiation size={16} className="text-amber-400" />
                    剂量网格
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    包含{selectedDoses.length}个剂量分布的统计数据和阈值
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={includeIssues}
                  onChange={(e) => setIncludeIssues(e.target.checked)}
                  className="mt-1 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                />
                <div>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <AlertTriangle size={16} className={unresolvedIssues > 0 ? 'text-red-400' : 'text-slate-500'} />
                    检测问题
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    包含{unresolvedIssues}个未解决的检测问题详情
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={includeScreenshots}
                  onChange={(e) => setIncludeScreenshots(e.target.checked)}
                  className="mt-1 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                />
                <div>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Image size={16} className="text-sky-400" />
                    截图
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    包含{screenshots.length}张3D视图截图
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors col-span-2">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="mt-1 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                />
                <div>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <FileText size={16} className="text-sky-400" />
                    医生备注
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    包含{notes.length}条医生备注和标签信息
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
            <h3 className="font-semibold text-white mb-4">报告摘要</h3>
            <pre className="p-4 bg-slate-900 rounded-lg text-xs text-slate-400 overflow-auto max-h-48 font-mono">
              {generateSummaryText()}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
            <h3 className="font-semibold text-white mb-4">导出预览</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">器官模型</span>
                <span className="text-white">{includeOrgans ? organs.length : 0} 个</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">剂量网格</span>
                <span className="text-white">{includeDoses ? doses.length : 0} 个</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">检测问题</span>
                <span className={unresolvedIssues > 0 ? 'text-red-400' : 'text-green-400'}>
                  {includeIssues ? unresolvedIssues : 0} 个未解决
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">截图</span>
                <span className="text-white">{includeScreenshots ? screenshots.length : 0} 张</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">医生备注</span>
                <span className="text-white">{includeNotes ? notes.length : 0} 条</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <Calendar size={14} />
                导出时间
              </div>
              <div className="text-white">{new Date().toLocaleString('zh-CN')}</div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <User size={14} />
                导出者
              </div>
              <div className="text-white">当前用户</div>
            </div>
          </div>

          {screenshots.length > 0 && includeScreenshots && (
            <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
              <h3 className="font-semibold text-white mb-4">包含的截图</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-700 rounded flex items-center justify-center">
                        <Image size={20} className="text-slate-500" />
                      </div>
                      <div>
                        <div className="text-white text-sm">{screenshot.name}</div>
                        <div className="text-xs text-slate-500">
                          {formatDate(screenshot.createTime)}
                        </div>
                      </div>
                    </div>
                    <Check size={16} className="text-teal-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {exportSuccess && (
              <div className="p-4 bg-teal-500/20 border border-teal-500/30 rounded-xl flex items-center gap-3">
                <CheckCircle size={20} className="text-teal-400 flex-shrink-0" />
                <div>
                  <div className="text-teal-400 font-medium text-sm">导出成功</div>
                  <div className="text-teal-400/70 text-xs">报告已下载，请检查浏览器下载目录</div>
                </div>
              </div>
            )}

            {exportError && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
                <XCircle size={20} className="text-red-400 flex-shrink-0" />
                <div>
                  <div className="text-red-400 font-medium text-sm">导出失败</div>
                  <div className="text-red-400/70 text-xs">{exportError}</div>
                </div>
              </div>
            )}

            {isExporting && (
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                  <span>正在生成{exportFormat.toUpperCase()}报告...</span>
                  <span>{Math.round(exportProgress)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {exportProgress < 30 ? '正在准备数据...' : 
                   exportProgress < 60 ? '正在渲染内容...' : 
                   exportProgress < 95 ? '正在生成文件...' : '正在下载...'}
                </div>
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={isExporting}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white transition-all',
                isExporting
                  ? 'bg-slate-700 cursor-not-allowed'
                  : 'bg-teal-500 hover:bg-teal-600 active:scale-98'
              )}
            >
              {exportSuccess ? (
                <>
                  <CheckCircle size={20} />
                  导出成功
                </>
              ) : isExporting ? (
                <>
                  <Download size={20} className="animate-pulse" />
                  导出中... {Math.round(exportProgress)}%
                </>
              ) : (
                <>
                  <Download size={20} />
                  导出{exportFormat.toUpperCase()}报告
                </>
              )}
            </button>

            <div className="text-xs text-slate-500 text-center pt-2">
              报告包含：{includeOrgans ? `${organs.length}个器官 · ` : ''}
              {includeDoses ? `${doses.length}个剂量 · ` : ''}
              {includeIssues ? `${issues.length}个问题 · ` : ''}
              {includeScreenshots ? `${screenshots.length}张截图 · ` : ''}
              {includeNotes ? `${notes.length}条备注` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
