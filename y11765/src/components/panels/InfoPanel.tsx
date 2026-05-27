import { useState } from 'react';
import {
  AlertTriangle,
  X,
  Clock,
  FileText,
  Camera,
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { takeScreenshot, createReportData, exportReportAsPDF } from '../../utils/reportGenerator';

export const InfoPanel = ({ canvas }: { canvas: HTMLCanvasElement | null }) => {
  const { errors, operations, motorConfig, clearError, clearAllErrors, addOperation } =
    useAppStore();
  const [activeTab, setActiveTab] = useState<'errors' | 'history' | 'report'>('errors');
  const [reportTitle, setReportTitle] = useState('电机磁场分析报告');
  const [reportNotes, setReportNotes] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTakeScreenshot = async () => {
    if (!canvas) return;

    try {
      const screenshot = await takeScreenshot(canvas);
      setScreenshots((prev) => [...prev, screenshot]);
      addOperation({
        type: 'param_change',
        previousValue: screenshots.length,
        newValue: screenshots.length + 1,
        sourceRef: 'InfoPanel.tsx:handleTakeScreenshot',
        description: '截取场景截图',
      });
    } catch (error) {
      console.error('截图失败:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!canvas) return;

    setIsGenerating(true);
    try {
      const currentScreenshot = await takeScreenshot(canvas);
      const allScreenshots = [...screenshots, currentScreenshot];

      const report = createReportData(
        reportTitle,
        motorConfig,
        allScreenshots,
        reportNotes,
        []
      );

      await exportReportAsPDF(report);

      addOperation({
        type: 'param_change',
        previousValue: null,
        newValue: report.id,
        sourceRef: 'InfoPanel.tsx:handleGenerateReport',
        description: `生成报告: ${reportTitle}`,
      });
    } catch (error) {
      console.error('报告生成失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="w-80 bg-slate-900/95 text-white h-full flex flex-col">
      <div className="flex border-b border-slate-700">
        {[
          { id: 'errors', label: '错误提示', icon: AlertTriangle, count: errors.length },
          { id: 'history', label: '操作记录', icon: Clock, count: 0 },
          { id: 'report', label: '报告导出', icon: FileText, count: 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <tab.icon size={14} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="absolute top-1 right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </div>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'errors' && (
          <div className="p-3 space-y-3">
            {errors.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Info size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无错误或警告</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    共 {errors.length} 条记录
                  </span>
                  <button
                    onClick={clearAllErrors}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    清空全部
                  </button>
                </div>
                {errors.map((error) => (
                  <div
                    key={error.id}
                    className={`p-3 rounded-lg border ${
                      error.severity === 'error'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {error.severity === 'error' ? (
                          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
                        )}
                        <span className="text-xs font-medium">
                          {error.severity === 'error' ? '错误' : '警告'}
                        </span>
                      </div>
                      <button
                        onClick={() => clearError(error.id)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <p className="text-sm mb-2">{error.message}</p>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">来源:</span>
                        <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                          {error.sourceLocation.file}:{error.sourceLocation.line}
                        </code>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">函数:</span>
                        <span>{error.sourceLocation.functionName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">时间:</span>
                        <span>{formatTime(error.timestamp)}</span>
                      </div>
                    </div>

                    {error.suggestion && (
                      <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs">
                        <span className="text-green-400">建议: </span>
                        <span className="text-slate-300">{error.suggestion}</span>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-3">
            {operations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无操作记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {operations.slice(0, 50).map((op, index) => (
                  <div
                    key={op.id}
                    className="p-2 bg-slate-800/50 rounded-lg border-l-2 border-blue-500/50"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-blue-400">
                        {op.type}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTime(op.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-1">{op.description}</p>
                    <div className="text-xs text-slate-500">
                      <code className="bg-slate-900 px-1 py-0.5 rounded text-[10px]">
                        {op.sourceRef}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="p-3 space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">报告标题</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">备注说明</label>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                rows={4}
                placeholder="输入实验备注和观察结果..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">
                  已截取截图 ({screenshots.length})
                </span>
                <button
                  onClick={handleTakeScreenshot}
                  disabled={!canvas}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                >
                  <Camera size={12} />
                  截取当前画面
                </button>
              </div>

              {screenshots.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {screenshots.map((src, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={src}
                        alt={`截图 ${i + 1}`}
                        className="w-full h-16 object-cover rounded"
                      />
                      <button
                        onClick={() =>
                          setScreenshots((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-700">
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating || !canvas}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                {isGenerating ? '生成中...' : '导出 PDF 报告'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
