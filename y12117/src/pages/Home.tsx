import { useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import FileUpload from '@/components/FileUpload';
import ParamConfig from '@/components/ParamConfig';
import CorrelationMatrix from '@/components/CorrelationMatrix';
import LagAnalysis from '@/components/LagAnalysis';
import TrendAnalysis from '@/components/TrendAnalysis';
import WarningPanel from '@/components/WarningPanel';
import DataTable from '@/components/DataTable';
import DataExport from '@/components/DataExport';
import { Grid3X3, Clock, TrendingUp, AlertTriangle, Database, RotateCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'warnings' as const, label: '问题警告', icon: AlertTriangle },
  { id: 'correlation' as const, label: '相关性', icon: Grid3X3 },
  { id: 'lag' as const, label: '滞后检测', icon: Clock },
  { id: 'trend' as const, label: '共同趋势', icon: TrendingUp },
  { id: 'data' as const, label: '数据明细', icon: Database }
];

export default function Home() {
  const { uploadedFiles, analysisResult, activeTab, setActiveTab, isAnalyzing, clearAll } = useAppStore();

  const warningCount = useMemo(() => {
    if (!analysisResult) return 0;
    return analysisResult.warnings.length;
  }, [analysisResult]);

  const errorCount = useMemo(() => {
    if (!analysisResult) return 0;
    return analysisResult.warnings.filter(w => w.severity === 'error').length;
  }, [analysisResult]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'correlation':
        return <CorrelationMatrix />;
      case 'lag':
        return <LagAnalysis />;
      case 'trend':
        return <TrendAnalysis />;
      case 'warnings':
        return <WarningPanel />;
      case 'data':
        return <DataTable />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-warning {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-pulse-warning {
          animation: pulse-warning 2s ease-in-out infinite;
        }
      `}</style>

      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-amber-400" />
                相关性误判提醒器
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                自动检测滞后关系和共同趋势，避免相关性误判
              </p>
            </div>
            <div className="flex items-center gap-4">
              {analysisResult && <DataExport />}
              {uploadedFiles.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  重置
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {analysisResult && warningCount > 0 && (
        <div className="bg-gradient-to-r from-red-900/40 to-amber-900/40 border-b border-red-800/50">
          <div className="max-w-[1800px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse-warning" />
                <div>
                  <p className="text-sm text-red-300 font-medium">
                    检测到 {warningCount} 个潜在问题
                    {errorCount > 0 && (
                      <span className="ml-2 text-red-400">
                        （{errorCount} 个严重）
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    请查看「问题警告」标签页了解详情
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('warnings')}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
              >
                立即查看
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {isAnalyzing && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
              <div className="w-16 h-16 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-200 mb-2">正在分析数据</h3>
              <p className="text-sm text-slate-400">
                正在计算相关性、检测滞后关系和共同趋势...
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <FileUpload />
            <ParamConfig />
          </div>

          <div className="col-span-12 lg:col-span-8">
            {analysisResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                    {tabs.map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const showBadge = tab.id === 'warnings' && warningCount > 0;
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                            isActive
                              ? "bg-slate-700 text-slate-100 shadow"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                          {showBadge && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-full text-xs font-medium",
                              errorCount > 0
                                ? "bg-red-900/50 text-red-300"
                                : "bg-amber-900/50 text-amber-300"
                            )}>
                              {warningCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-sm text-slate-400">
                    <span className="font-mono text-cyan-400">{analysisResult.alignedData.length}</span> 行数据 ·
                    <span className="font-mono text-cyan-400 ml-1">{analysisResult.correlationMatrix.length}</span> 组相关
                  </div>
                </div>

                <div className="min-h-[600px]">
                  {renderTabContent()}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl p-12 text-center">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Grid3X3 className="h-10 w-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-medium text-slate-300 mb-2">
                  {uploadedFiles.length === 0
                    ? '上传数据开始分析'
                    : '配置参数后开始分析'}
                </h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  {uploadedFiles.length === 0
                    ? '拖拽 CSV 文件到左侧上传区域，或点击「加载示例数据」快速体验功能'
                    : '选择时间字段和至少2个指标字段，然后点击「开始分析」按钮'}
                </p>
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 flex items-center justify-center gap-4 text-sm text-slate-500">
                    <span>已上传 <span className="text-cyan-400 font-mono">{uploadedFiles.length}</span> 个文件</span>
                    <span>•</span>
                    <span>共 <span className="text-cyan-400 font-mono">{uploadedFiles.reduce((sum, f) => sum + f.rows.length, 0)}</span> 行数据</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="max-w-[1800px] mx-auto px-6 text-center text-xs text-slate-600">
          <p>相关性误判提醒器 · 检测滞后关系和共同趋势 · 帮助新人理解「相关性 ≠ 因果性」</p>
          <p className="mt-1">图表、明细数据和导出文件均来自同一批对齐后的数据</p>
        </div>
      </footer>
    </div>
  );
}
