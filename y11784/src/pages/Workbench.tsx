import { useState } from 'react';
import { Upload, Calculator, Menu, X, Info } from 'lucide-react';
import { VectorFieldEditor } from '@/components/VectorFieldEditor';
import { PathEditor } from '@/components/PathEditor';
import { VisualizationCanvas } from '@/components/VisualizationCanvas';
import { IntegrationPanel } from '@/components/IntegrationPanel';
import { AlertPanel } from '@/components/AlertPanel';
import { ResultChart } from '@/components/ResultChart';
import { RevisionTimeline } from '@/components/RevisionTimeline';
import { ReportExport } from '@/components/ReportExport';
import { DataImportModal } from '@/components/DataImportModal';
import { usePathStore } from '@/store/pathStore';
import { useResultStore } from '@/store/resultStore';
import { useGlobalAnomalyStats } from '@/hooks/useGlobalAnomalyStats';
import { cn } from '@/lib/utils';

export default function Workbench() {
  const { vectorFields, activeVectorFieldId } = usePathStore();
  const { results } = useResultStore();
  const { errorCount, warningCount } = useGlobalAnomalyStats();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState<'left' | 'right' | null>(null);

  const selectedVectorField = vectorFields.find((vf) => vf.id === activeVectorFieldId);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebar(mobileSidebar === 'left' ? null : 'left')}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calculator className="w-6 h-6 text-blue-400" />
              <h1 className="text-lg font-semibold tracking-tight">曲线积分路径比较工具</h1>
            </div>
            {selectedVectorField && (
              <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1 bg-slate-800 rounded-lg">
                <span className="text-xs text-slate-400">当前向量场:</span>
                <span className="text-sm font-medium text-blue-400">{selectedVectorField.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(errorCount > 0 || warningCount > 0) && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                {errorCount > 0 && (
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                    {errorCount} 错误
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
                    {warningCount} 警告
                  </span>
                )}
              </div>
            )}
            <span className="hidden sm:inline text-xs text-slate-400">
              {results.length} 个计算结果
            </span>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="使用帮助"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">导入数据</span>
            </button>
          </div>
        </div>
      </header>

      {showHelp && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-[1920px] mx-auto flex items-start justify-between gap-4">
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">快速上手</p>
              <ul className="text-xs text-blue-700 space-y-0.5">
                <li>• 双击画布添加路径节点，拖拽移动节点，Delete 键删除选中节点</li>
                <li>• 滚轮缩放画布，按住中键或空格拖拽平移画布</li>
                <li>• 配置积分参数后点击"开始计算"进行批量积分</li>
                <li>• 异常数据会被标记，可在右侧异常面板查看详情</li>
              </ul>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1920px] mx-auto flex relative">
        <aside className={cn(
          'w-80 flex-shrink-0 bg-slate-50 border-r border-slate-200 overflow-y-auto transition-all',
          'lg:block lg:h-[calc(100vh-3.5rem)] lg:sticky lg:top-14',
          mobileSidebar === 'left' ? 'fixed inset-0 z-50 w-full h-[calc(100vh-3.5rem)]' : 'hidden'
        )}>
          <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-200 bg-white">
            <span className="font-medium text-slate-800">配置面板</span>
            <button
              onClick={() => setMobileSidebar(null)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <VectorFieldEditor />
            <PathEditor />
            <IntegrationPanel />
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <VisualizationCanvas />
          </div>
        </main>

        <aside className={cn(
          'w-80 flex-shrink-0 bg-slate-50 border-l border-slate-200 overflow-y-auto transition-all',
          'lg:block lg:h-[calc(100vh-3.5rem)] lg:sticky lg:top-14',
          mobileSidebar === 'right' ? 'fixed inset-0 z-50 w-full h-[calc(100vh-3.5rem)]' : 'hidden'
        )}>
          <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-200 bg-white">
            <span className="font-medium text-slate-800">结果面板</span>
            <button
              onClick={() => setMobileSidebar(null)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <ResultChart />
            <AlertPanel />
            <RevisionTimeline />
            <ReportExport visualizationElementId="visualization-canvas" />
          </div>
        </aside>

        <div className="lg:hidden fixed bottom-4 right-4 flex gap-2 z-30">
          <button
            onClick={() => setMobileSidebar(mobileSidebar === 'left' ? null : 'left')}
            className={cn(
              'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors',
              mobileSidebar === 'left' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            )}
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileSidebar(mobileSidebar === 'right' ? null : 'right')}
            className={cn(
              'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors',
              mobileSidebar === 'right' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            )}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18h12M9 12h12M9 6h12M3 18h.01M3 12h.01M3 6h.01" />
            </svg>
          </button>
        </div>
      </div>

      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
