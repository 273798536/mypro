import {
  Play,
  Pause,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  Grid3X3,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useViewStore } from '../../store/useViewStore';
import { useRiskStore } from '../../store/useRiskStore';
import { Owner } from '../../types';

interface HeaderProps {
  onExport: () => void;
}

export const Header = ({ onExport }: HeaderProps) => {
  const project = useProjectStore((state) => state.project);
  const owners = useProjectStore((state) => state.owners);
  const resetToDefaults = useProjectStore((state) => state.resetToDefaults);
  
  const timeSlice = useViewStore((state) => state.timeSlice);
  const setTimeSlice = useViewStore((state) => state.setTimeSlice);
  const selectedOwnerId = useViewStore((state) => state.selectedOwnerId);
  const setSelectedOwner = useViewStore((state) => state.setSelectedOwner);
  const isPlaying = useViewStore((state) => state.isPlaying);
  const togglePlay = useViewStore((state) => state.togglePlay);
  const showLabels = useViewStore((state) => state.showLabels);
  const toggleLabels = useViewStore((state) => state.toggleLabels);
  const showGrid = useViewStore((state) => state.showGrid);
  const toggleGrid = useViewStore((state) => state.toggleGrid);
  const toggleLeftPanel = useViewStore((state) => state.toggleLeftPanel);
  const toggleRightPanel = useViewStore((state) => state.toggleRightPanel);
  const resetView = useViewStore((state) => state.resetView);

  const risks = useRiskStore((state) => state.risks);
  const unresolvedRisks = risks.filter((r) => !r.resolved);

  const handleReset = () => {
    resetToDefaults();
    resetView();
  };

  const formatDate = (ratio: number): string => {
    if (!project) return '';
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const totalMs = end.getTime() - start.getTime();
    const currentMs = start.getTime() + totalMs * ratio;
    return new Date(currentMs).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getOwnerName = (ownerId: string | null): string => {
    if (!ownerId) return '全部负责人';
    const owner = owners.find((o: Owner) => o.id === ownerId);
    return owner?.name || '全部负责人';
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleLeftPanel}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="切换左侧面板"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {project?.name || '项目现金燃尽曲面'}
            </h1>
            <p className="text-xs text-slate-400">
              {project?.startDate} ~ {project?.endDate}
            </p>
          </div>
        </div>

        {unresolvedRisks.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">
              {unresolvedRisks.length} 个风险待处理
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2">
          <button
            onClick={togglePlay}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-slate-300" />
            ) : (
              <Play className="w-4 h-4 text-slate-300" />
            )}
          </button>
          
          <div className="w-64">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={timeSlice}
              onChange={(e) => setTimeSlice(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          
          <span className="text-sm text-slate-400 font-mono w-28">
            {formatDate(timeSlice)}
          </span>
        </div>

        <div className="relative">
          <select
            value={selectedOwnerId || ''}
            onChange={(e) => setSelectedOwner(e.target.value || null)}
            className="appearance-none bg-slate-800/50 text-slate-300 px-4 py-2 pr-10 rounded-xl border border-slate-700/50 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">全部负责人</option>
            {owners.map((owner: Owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
          <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleLabels}
            className={`p-2 rounded-lg transition-colors ${
              showLabels ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="显示/隐藏标签"
          >
            {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleGrid}
            className={`p-2 rounded-lg transition-colors ${
              showGrid ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="显示/隐藏网格"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-8 w-px bg-slate-700" />

        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">导出图片</span>
        </button>

        <button
          onClick={handleReset}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="重置数据和视图"
        >
          <RotateCcw className="w-5 h-5 text-slate-400" />
        </button>

        <button
          onClick={toggleRightPanel}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="切换右侧面板"
        >
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    </header>
  );
};
