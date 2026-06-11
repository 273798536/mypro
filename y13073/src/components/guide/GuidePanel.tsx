import { useViewStore } from '../../store/viewStore';
import { X, Play, RefreshCw, FileSpreadsheet } from 'lucide-react';

interface GuidePanelProps {
  onLoadDemo: () => void;
  onRerun: () => void;
  onViewCsv: () => void;
}

export const GuidePanel = ({ onLoadDemo, onRerun, onViewCsv }: GuidePanelProps) => {
  const showGuide = useViewStore((s) => s.showGuide);
  const setShowGuide = useViewStore((s) => s.setShowGuide);

  if (!showGuide) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-[700px] max-w-[95vw] shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-100">山地索道站剖面讲解</h2>
          <button
            onClick={() => setShowGuide(false)}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          本工具用于CAD图层数据复核，帮助您快速定位异常点、追溯原始材料、检测时间轴缺段。
          以下是三项核心操作说明：
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/50 transition-colors group cursor-pointer"
               onClick={onLoadDemo}>
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-500/30 transition-colors">
              <Play className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">放样例</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              加载内置的演示数据，包含边界样本和时间轴缺段等异常情况，用于快速了解系统功能。
            </p>
            <div className="mt-3 text-xs text-orange-400 font-medium">
              点击立即加载 →
            </div>
          </div>

          <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/50 transition-colors group cursor-pointer"
               onClick={onRerun}>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-500/30 transition-colors">
              <RefreshCw className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">重跑</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              重新执行异常检测算法，基于当前数据重新计算边界值异常、突变异常和时间轴缺段。
            </p>
            <div className="mt-3 text-xs text-blue-400 font-medium">
              点击重新检测 →
            </div>
          </div>

          <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/50 transition-colors group cursor-pointer"
               onClick={onViewCsv}>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-500/30 transition-colors">
              <FileSpreadsheet className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">查看CSV明细</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              查看完整的原始数据表格，支持按行号定位、搜索、排序，每条记录可追溯来源。
            </p>
            <div className="mt-3 text-xs text-green-400 font-medium">
              点击查看明细 →
            </div>
          </div>
        </div>

        <div className="mt-6 p-3 bg-slate-900/50 rounded border border-slate-700">
          <div className="text-xs text-slate-500">
            <span className="text-yellow-400 font-medium">提示：</span>
            点击图表中的异常点可查看完整追溯信息，包括来源、处理状态、原始CAD字段和影响范围。
            调整筛选条件和视角后可保存视图，方便后续截图复核。
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => setShowGuide(false)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
          >
            开始使用
          </button>
        </div>
      </div>
    </div>
  );
};
