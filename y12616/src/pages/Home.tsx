
import React, { useState } from 'react';
import { Download, Undo2, Redo2, Map, Grid } from 'lucide-react';
import { Chessboard } from '../components/Chessboard/Chessboard';
import { PathList } from '../components/Toolbar/PathList';
import { FilterPanel } from '../components/Toolbar/FilterPanel';
import { HistoryTimeline } from '../components/Toolbar/HistoryTimeline';
import { TrackInfo } from '../components/DetailPanel/TrackInfo';
import { AnomalyPanel } from '../components/DetailPanel/AnomalyPanel';
import { ExportModal } from '../components/ExportModal/ExportModal';
import { useUndoRedo } from '../hooks/useUndoRedo';

const Home: React.FC = () => {
  const [showExportModal, setShowExportModal] = useState(false);
  const { canUndo, canRedo, undo, redo } = useUndoRedo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 bg-grid-pattern">
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-mining-500/20 rounded-lg">
              <Map size={20} className="text-mining-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                矿区运输路径棋盘
              </h1>
              <p className="text-xs text-slate-400">
                交互式路径审核与异常检测系统
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
              <button
                onClick={undo}
                disabled={!canUndo}
                className={`p-2 rounded-md transition-all ${
                  canUndo
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
                title="撤销 (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={`p-2 rounded-md transition-all ${
                  canRedo
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
                title="重做 (Ctrl+Shift+Z)"
              >
                <Redo2 size={16} />
              </button>
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-mining-500 hover:bg-mining-400 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-mining-500/25"
            >
              <Download size={16} />
              导出报告
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
              <PathList />
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
              <FilterPanel />
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
              <HistoryTimeline />
            </div>
          </div>

          <div className="col-span-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid size={16} className="text-slate-400" />
                <span className="text-sm text-slate-400">棋盘视图</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>提示: 拖拽节点调整路径</span>
              </div>
            </div>
            <Chessboard width={600} height={500} />
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                旧表导出
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                人工补录
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                原始记录
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                混合来源
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-3 rounded border-2 border-dashed border-red-500" />
                禁行区域
              </div>
            </div>
          </div>

          <div className="col-span-3 space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
              <TrackInfo />
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm scrollbar-thin">
              <AnomalyPanel />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">边界案例说明</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
              <div className="text-xs font-medium text-red-400 mb-1">案例一：比例尺错用</div>
              <p className="text-xs text-slate-400">2023年旧数据表中，坐标单位标注为千米实际应为米，导致路径长度偏差1000倍</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
              <div className="text-xs font-medium text-yellow-400 mb-1">案例二：坐标翻转</div>
              <p className="text-xs text-slate-400">人工补录数据中，X/Y坐标写反导致路径经过禁止通行区域</p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/30">
              <div className="text-xs font-medium text-orange-400 mb-1">案例三：单位漏填</div>
              <p className="text-xs text-slate-400">混合来源数据中部分节点漏填单位，使用默认1:1比例尺造成显示异常</p>
            </div>
          </div>
        </div>
      </main>

      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
};

export default Home;
