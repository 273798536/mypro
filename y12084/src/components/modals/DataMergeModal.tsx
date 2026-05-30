import { useAppStore } from '@/store/useAppStore';
import { DataMergeConflict } from '@/types';
import { formatValue } from '@/utils/geometry';
import { X, AlertTriangle, Check, Building2, Wind, ArrowRight, Users } from 'lucide-react';

interface ConflictRowProps {
  conflict: DataMergeConflict;
  buildingName: string;
}

function ConflictRow({ conflict, buildingName }: ConflictRowProps) {
  const { resolveMergeConflict } = useAppStore(state => state.actions);

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'height': return '建筑高度';
      case 'position': return '位置坐标';
      case 'dimensions': return '体量尺寸';
      default: return field;
    }
  };

  return (
    <div className={`p-4 border rounded-lg transition-all ${
      conflict.resolved
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-yellow-500/30 bg-yellow-500/5'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {conflict.resolved ? (
            <div className="p-1.5 rounded bg-green-500/20">
              <Check size={16} className="text-green-400" />
            </div>
          ) : (
            <div className="p-1.5 rounded bg-yellow-500/20">
              <AlertTriangle size={16} className="text-yellow-400" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-medium text-white">{buildingName}</h4>
            <p className="text-xs text-slate-400">{getFieldLabel(conflict.fieldName)} 数据不一致</p>
          </div>
        </div>
        {conflict.resolved && (
          <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
            已解决
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="p-3 bg-slate-800/50 rounded">
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 size={14} className="text-blue-400" />
            <span className="text-xs text-slate-400">建筑团队</span>
          </div>
          <p className="text-sm text-white font-mono">
            {formatValue(conflict.buildingValue)}
          </p>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight size={20} className="text-slate-600" />
        </div>

        <div className="p-3 bg-slate-800/50 rounded">
          <div className="flex items-center gap-1.5 mb-2">
            <Wind size={14} className="text-cyan-400" />
            <span className="text-xs text-slate-400">风环境团队</span>
          </div>
          <p className="text-sm text-white font-mono">
            {formatValue(conflict.windRoseValue)}
          </p>
        </div>
      </div>

      {!conflict.resolved && (
        <div className="flex gap-2">
          <button
            onClick={() => resolveMergeConflict(conflict.id, 'use-building')}
            className="flex-1 px-3 py-2 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded transition-colors flex items-center justify-center gap-1"
          >
            <Building2 size={12} />
            使用建筑数据
          </button>
          <button
            onClick={() => resolveMergeConflict(conflict.id, 'use-wind')}
            className="flex-1 px-3 py-2 text-xs bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 rounded transition-colors flex items-center justify-center gap-1"
          >
            <Wind size={12} />
            使用风环境数据
          </button>
        </div>
      )}

      {conflict.resolved && (
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <Users size={12} />
          已选择: {conflict.resolution === 'use-building' ? '建筑团队数据' : '风环境团队数据'}
        </div>
      )}
    </div>
  );
}

export default function DataMergeModal() {
  const showModal = useAppStore(state => state.showDataMergeModal);
  const mergeConflicts = useAppStore(state => state.mergeConflicts);
  const buildings = useAppStore(state => state.buildings);
  const isDataMerged = useAppStore(state => state.isDataMerged);
  const { toggleDataMergeModal, completeDataMerge } = useAppStore(state => state.actions);

  if (!showModal) return null;

  const unresolvedCount = mergeConflicts.filter(c => !c.resolved).length;

  const getBuildingName = (buildingId: string) => {
    return buildings.find(b => b.id === buildingId)?.name || buildingId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              <AlertTriangle size={20} className="text-yellow-400" />
              数据合并冲突
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              建筑体块数据与风向玫瑰数据存在 {mergeConflicts.length} 处冲突，请人工确认后继续
            </p>
          </div>
          <button
            onClick={() => !isDataMerged && toggleDataMergeModal(false)}
            disabled={!isDataMerged}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold border-2 border-slate-900">
                    建
                  </div>
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-bold border-2 border-slate-900">
                    风
                  </div>
                </div>
                <div>
                  <p className="text-sm text-white">建筑团队 × 风环境团队 数据合并</p>
                  <p className="text-xs text-slate-400">
                    {unresolvedCount > 0
                      ? `还有 ${unresolvedCount} 处冲突需要确认`
                      : '所有冲突已解决，可以完成合并'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {mergeConflicts.length - unresolvedCount} / {mergeConflicts.length}
                </p>
                <p className="text-xs text-slate-400">已解决</p>
              </div>
            </div>

            <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${((mergeConflicts.length - unresolvedCount) / mergeConflicts.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {mergeConflicts.map(conflict => (
              <ConflictRow
                key={conflict.id}
                conflict={conflict}
                buildingName={getBuildingName(conflict.buildingId)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            提示：合并完成后将自动执行冲突检测
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => toggleDataMergeModal(false)}
              className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              稍后处理
            </button>
            <button
              onClick={completeDataMerge}
              disabled={unresolvedCount > 0}
              className="px-6 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Check size={16} />
              完成合并
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
