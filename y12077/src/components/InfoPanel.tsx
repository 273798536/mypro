import { Package, MapPin, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, getConflictColor } from '../utils/heatColor';

export function InfoPanel() {
  const {
    selectedLocationId,
    locations,
    skus,
    conflicts,
    dataSources,
    inOutRecords,
    selectedConflictId,
    setSelectedConflictId,
    resolveConflict,
    unresolveConflict,
    getHeatValueForLocation,
  } = useStore();

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const selectedSku = selectedLocation?.skuId
    ? skus.find((s) => s.id === selectedLocation.skuId)
    : null;
  const locationRecords = selectedLocationId
    ? inOutRecords.filter((r) => r.locationId === selectedLocationId).slice(0, 5)
    : [];

  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);
  const resolvedConflicts = conflicts.filter((c) => c.resolved);

  const getSourceFileName = (sourceId: string) => {
    const source = dataSources.find((s) => s.id === sourceId);
    return source?.fileName || '未知文件';
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <MapPin size={18} className="text-blue-400" />
          货位详情
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedLocation ? (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-mono font-bold text-blue-400 mb-2">
                {selectedLocation.code}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">层</div>
                <div className="text-white">{selectedLocation.layer}</div>
                <div className="text-gray-400">列</div>
                <div className="text-white">{selectedLocation.col}</div>
                <div className="text-gray-400">排</div>
                <div className="text-white">{selectedLocation.row}</div>
                <div className="text-gray-400">热度值</div>
                <div className="text-orange-400 font-bold">
                  {getHeatValueForLocation(selectedLocation.id).toFixed(1)}
                </div>
              </div>
            </div>

            {selectedSku && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                  <Package size={14} />
                  存放商品
                </div>
                <div className="text-white font-medium">{selectedSku.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {selectedSku.id} · {selectedSku.category} · {selectedSku.weight}kg
                </div>
              </div>
            )}

            {selectedLocation.isOccluded && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3">
                <div className="text-yellow-400 text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={14} />
                  高度遮挡提醒
                </div>
                <div className="text-yellow-300/70 text-xs mt-1">
                  该货位被前排货位遮挡，拣货效率较低
                </div>
              </div>
            )}

            {locationRecords.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-300 mb-2">
                  最近操作记录
                </div>
                <div className="space-y-2">
                  {locationRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-gray-800 rounded p-2 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`font-medium ${
                            record.type === 'in'
                              ? 'text-green-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {record.type === 'in' ? '入库' : '出库'}
                        </span>
                        <span className="text-gray-500">
                          {formatDate(record.timestamp)}
                        </span>
                      </div>
                      <div className="text-gray-400 mt-1">
                        {record.operator} · {record.sourceFile}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            <MapPin size={48} className="mx-auto mb-2 opacity-30" />
            <p>点击货架上的货位查看详情</p>
          </div>
        )}

        <div className="mt-6 border-t border-gray-700 pt-4">
          <div className="text-sm font-bold text-gray-300 mb-3 flex items-center justify-between">
            <span>冲突检测结果</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                unresolvedConflicts.length > 0
                  ? 'bg-red-900 text-red-300'
                  : 'bg-green-900 text-green-300'
              }`}
            >
              {unresolvedConflicts.length} 未解决
            </span>
          </div>

          <div className="space-y-2">
            {unresolvedConflicts.map((conflict) => (
              <div
                key={conflict.id}
                onClick={() =>
                  setSelectedConflictId(
                    selectedConflictId === conflict.id ? null : conflict.id
                  )
                }
                className={`rounded-lg p-3 cursor-pointer transition-all border ${
                  selectedConflictId === conflict.id
                    ? 'bg-gray-700 border-gray-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle
                    size={16}
                    style={{ color: getConflictColor(conflict.type) }}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {conflict.locationId.replace('loc-', '')}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {conflict.description}
                    </div>
                    {selectedConflictId === conflict.id && (
                      <div className="mt-2 pt-2 border-t border-gray-600">
                        <div className="text-xs text-gray-500 mb-1">来源文件:</div>
                        {conflict.sourceIds.map((sid) => (
                          <div
                            key={sid}
                            className="text-xs text-gray-400 flex items-center gap-1"
                          >
                            <span className="text-yellow-500">→</span>
                            {getSourceFileName(sid)}
                          </div>
                        ))}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveConflict(conflict.id);
                          }}
                          className="mt-2 text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded hover:bg-green-900 flex items-center gap-1"
                        >
                          <CheckCircle size={12} />
                          标记已解决
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {resolvedConflicts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-500 mb-2">已解决</div>
                {resolvedConflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="rounded p-2 bg-gray-800/50 flex items-center justify-between"
                  >
                    <span className="text-xs text-gray-500 line-through">
                      {conflict.locationId.replace('loc-', '')}
                    </span>
                    <button
                      onClick={() => unresolveConflict(conflict.id)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
