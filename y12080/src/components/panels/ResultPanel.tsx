import { useStageStore } from '../../store/useStageStore';
import { AlertTriangle, Clock, CheckCircle, XCircle, User, Link } from 'lucide-react';

export function ResultPanel() {
  const {
    results,
    selectedResultId,
    setSelectedResult,
    updateResult,
    getLightsByIds,
    getRoutesByIds,
    getObstaclesByIds,
  } = useStageStore();

  const selectedResult = results.find((r) => r.id === selectedResultId);

  const typeLabels = {
    light_conflict: { label: '灯位冲突', color: 'text-red-400', bg: 'bg-red-900/50' },
    route_occlusion: { label: '路线遮挡', color: 'text-amber-400', bg: 'bg-amber-900/50' },
    paragraph_mismatch: { label: '段落错位', color: 'text-purple-400', bg: 'bg-purple-900/50' },
  };

  const statusLabels = {
    pending: { label: '待确认', icon: Clock, color: 'text-amber-400' },
    confirmed: { label: '已确认', icon: CheckCircle, color: 'text-green-400' },
    resolved: { label: '已解决', icon: XCircle, color: 'text-gray-400' },
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/90 text-white">
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          检测结果
          <span className="ml-auto text-xs bg-red-500 px-2 py-0.5 rounded">
            {results.filter((r) => r.status === 'pending').length} 待确认
          </span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {results.map((result) => {
          const typeConfig = typeLabels[result.type];
          const statusConfig = statusLabels[result.status];
          const StatusIcon = statusConfig.icon;
          const statusClass = statusConfig.color;

          return (
            <div
              key={result.id}
              className={`
                p-2 rounded-lg cursor-pointer transition-all text-left w-full
                ${selectedResultId === result.id
                  ? 'bg-cyan-900/50 border border-cyan-500'
                  : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50'
                }
              `}
              onClick={() => setSelectedResult(result.id)}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={14}
                  className={`mt-0.5 flex-shrink-0 ${result.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold">{typeConfig.label}</span>
                    {result.severity === 'error' && (
                      <span className="text-[10px] bg-red-900/50 text-red-400 px-1 rounded">
                        严重
                      </span>
                    )}
                    <span className={`ml-auto text-[10px] ${statusClass} flex items-center gap-1`}>
                      <StatusIcon size={10} />
                      {statusConfig.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    {result.description}
                  </p>
                  {result.assignee && (
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <User size={10} />
                      下一步找 {result.assignee} 核
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedResult && (
        <div className="p-3 border-t border-gray-700 bg-gray-800/50">
          <h3 className="text-xs font-bold mb-2">关联信息</h3>
          <div className="space-y-2 text-[11px]">
            {selectedResult.relatedLightIds && selectedResult.relatedLightIds.length > 0 && (
              <div>
                <label className="text-gray-400">关联灯位</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getLightsByIds(selectedResult.relatedLightIds).map((light) => (
                    <span
                      key={light.id}
                      className="px-2 py-0.5 rounded text-[10px] bg-gray-700 flex items-center gap-1"
                    >
                      <Link size={10} />
                      {light.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedResult.relatedRouteIds && selectedResult.relatedRouteIds.length > 0 && (
              <div>
                <label className="text-gray-400">关联路线</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getRoutesByIds(selectedResult.relatedRouteIds).map((route) => (
                    <span
                      key={route.id}
                      className="px-2 py-0.5 rounded text-[10px] bg-gray-700"
                      style={{ color: route.color }}
                    >
                      {route.actorName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedResult.relatedObstacleIds && selectedResult.relatedObstacleIds.length > 0 && (
              <div>
                <label className="text-gray-400">关联障碍物</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getObstaclesByIds(selectedResult.relatedObstacleIds).map((obs) => (
                    <span
                      key={obs.id}
                      className="px-2 py-0.5 rounded text-[10px] bg-gray-700"
                    >
                      {obs.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedResult.notes && (
              <div className="mt-2 p-2 bg-gray-700/50 rounded text-[10px] text-gray-300">
                💡 {selectedResult.notes}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => updateResult(selectedResult.id, { status: 'confirmed' })}
              className="flex-1 py-1 px-2 bg-green-700 hover:bg-green-600 rounded text-[10px] transition-colors"
            >
              确认
            </button>
            <button
              onClick={() => updateResult(selectedResult.id, { status: 'resolved' })}
              className="flex-1 py-1 px-2 bg-gray-600 hover:bg-gray-500 rounded text-[10px] transition-colors"
            >
              解决
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
