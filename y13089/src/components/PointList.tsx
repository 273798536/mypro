import { useLightingStore } from '@/store/lightingStore';
import { CheckCircle2, Circle, AlertTriangle, MapPin, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PointList() {
  const {
    getFilteredPoints,
    selectedPointId,
    setSelectedPointId,
    processedPointIds,
    togglePointProcessed,
    exceptions
  } = useLightingStore();

  const filteredPoints = getFilteredPoints();
  const exceptionPointIds = new Set(exceptions.flatMap((e) => e.relatedPointIds));

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            点位列表
          </h3>
          <span className="text-sm text-gray-500">
            共 {filteredPoints.length} 个点位
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredPoints.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>没有符合筛选条件的点位</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredPoints.map((point) => {
              const isSelected = selectedPointId === point.id;
              const isProcessed = processedPointIds.includes(point.id);
              const hasException = exceptionPointIds.has(point.id);
              const hasNameInconsistency = point.name !== point.originalName;

              return (
                <li
                  key={point.id}
                  onClick={() => setSelectedPointId(isSelected ? null : point.id)}
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    isSelected
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : "hover:bg-gray-50 border-l-4 border-transparent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePointProcessed(point.id);
                      }}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {isProcessed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {point.name}
                            </span>
                            {hasNameInconsistency && (
                              <span title={`名称不一致: 原始名称为"${point.originalName}"`}>
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              </span>
                            )}
                            {hasException && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500" title="关联异常" />
                            )}
                          </div>
                          {hasNameInconsistency && (
                            <p className="text-xs text-amber-600 mt-1">
                              原始名称: {point.originalName}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {point.id}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>展柜: {point.showcaseName}</span>
                        <span>方案: {point.lightingScheme}</span>
                        <span>坐标: ({point.x}, {point.y}, {point.z})</span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {point.lux} lux
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {point.colorTemperature} K
                        </span>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          point.cri >= 90
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        )}>
                          CRI {point.cri}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
