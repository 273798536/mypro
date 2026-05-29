import { Calendar, Trash2, Download, Play, Edit, FileText } from 'lucide-react';
import type { TacticsScheme } from '../../engine/types';

interface SchemeCardProps {
  scheme: TacticsScheme;
  hasReport: boolean;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (scheme: TacticsScheme) => void;
  onSimulate?: (scheme: TacticsScheme) => void;
  onViewReport?: (schemeId: string) => void;
}

export function SchemeCard({ scheme, hasReport, onLoad, onDelete, onExport, onSimulate, onViewReport }: SchemeCardProps) {
  const robotCount = scheme.elements.filter((e) => e.type === 'robot').length;
  const obstacleCount = scheme.elements.filter((e) => e.type === 'obstacle').length;
  const passPointCount = scheme.elements.filter((e) => e.type === 'passPoint').length;
  const hasBall = scheme.elements.some((e) => e.type === 'ball');
  const pathCount = scheme.paths.length;

  return (
    <div className="bg-slate-800 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-shadow border border-slate-700 hover:border-slate-600">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-white truncate flex-1">{scheme.name}</h3>
        <div className="flex items-center gap-1">
          {scheme.lastScore !== undefined && (
            <span
              className={`text-sm font-bold px-2 py-0.5 rounded ${
                scheme.lastScore >= 80
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : scheme.lastScore >= 60
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {scheme.lastScore}分
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-1 rounded-full">
          {robotCount} 机器人
        </span>
        <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-1 rounded-full">
          {obstacleCount} 障碍
        </span>
        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
          {passPointCount} 传球点
        </span>
        {hasBall && (
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
            有球
          </span>
        )}
        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
          {pathCount} 路径
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <Calendar className="w-3.5 h-3.5" />
        <span>更新于 {new Date(scheme.updatedAt).toLocaleString()}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onLoad(scheme.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
          编辑
        </button>
        {onSimulate && (
          <button
            onClick={() => onSimulate(scheme)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            模拟
          </button>
        )}
        {hasReport && onViewReport && (
          <button
            onClick={() => onViewReport(scheme.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            报告
          </button>
        )}
        <button
          onClick={() => onExport(scheme)}
          className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          title="导出"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(scheme.id)}
          className="p-2 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-colors"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
