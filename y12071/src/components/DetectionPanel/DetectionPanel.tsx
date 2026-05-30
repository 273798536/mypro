import { AlertTriangle, AlertCircle, Info, MapPin, ArrowRight, Check } from 'lucide-react';
import { useStore, useCurrentResults } from '../../store/useStore';
import { DetectionResult } from '../../types';
import { compareDetections } from '../../engine/DetectionEngine';

const severityColors: Record<string, string> = {
  high: 'bg-red-900 border-red-600 text-red-200',
  medium: 'bg-orange-900 border-orange-600 text-orange-200',
  low: 'bg-yellow-900 border-yellow-600 text-yellow-200',
};

const severityBadge: Record<string, string> = {
  high: 'bg-red-600 text-white',
  medium: 'bg-orange-500 text-white',
  low: 'bg-yellow-500 text-black',
};

const typeIcons: Record<string, string> = {
  offset: '📐',
  missing_support: '🔧',
  sensor_offline: '📡',
  route_conflict: '⚠️',
};

const typeNames: Record<string, string> = {
  offset: '坐标偏移',
  missing_support: '支护缺失',
  sensor_offline: '传感器异常',
  route_conflict: '路线冲突',
};

function DetectionItem({ detection, isSelected, onClick }: {
  detection: DetectionResult;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-900 border-blue-500 ring-1 ring-blue-400'
          : `${severityColors[detection.severity]} hover:opacity-80`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span>{typeIcons[detection.type]}</span>
            <span className="font-medium text-sm">{typeNames[detection.type]}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${severityBadge[detection.severity]}`}>
              {detection.severity === 'high' ? '高危' : detection.severity === 'medium' ? '中危' : '低危'}
            </span>
            {detection.affectedByRoute && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                受路线影响
              </span>
            )}
          </div>
          <p className="text-xs opacity-80 mb-2">{detection.description}</p>
          <div className="flex items-center gap-1 text-xs opacity-60">
            <MapPin className="w-3 h-3" />
            <span>({detection.position.map(v => v.toFixed(1)).join(', ')})</span>
          </div>
          {detection.offset && (
            <div className="mt-2 text-xs">
              <div className="flex items-center gap-2 opacity-70">
                <span>期望: ({detection.offset.expected.map(v => v.toFixed(2)).join(', ')})</span>
              </div>
              <div className="flex items-center gap-2 opacity-70 mt-1">
                <span>实际: ({detection.offset.actual.map(v => v.toFixed(2)).join(', ')})</span>
              </div>
              <div className="flex items-center gap-2 text-orange-300 mt-1">
                <ArrowRight className="w-3 h-3" />
                <span>偏移距离: {detection.offset.distance.toFixed(3)}m</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DetectionPanel() {
  const { detection, ui, setSelectedDetectionId } = useStore();
  const currentResults = useCurrentResults();
  
  const comparison = detection.firstPassResults.length > 0 && detection.secondPassResults.length > 0
    ? compareDetections(detection.firstPassResults, detection.secondPassResults)
    : null;

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          检测结果
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          共发现 {currentResults.length} 项问题
        </p>
      </div>

      {comparison && ui.compareMode && (
        <div className="p-4 border-b border-slate-700 bg-slate-800">
          <div className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            前后对比分析
          </div>
          
          {comparison.changed.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-blue-400 mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                受人员路线影响 ({comparison.changed.length}项)
              </div>
              <div className="space-y-2">
                {comparison.changed.map(d => (
                  <div key={d.id} className="text-xs bg-blue-900 bg-opacity-50 p-2 rounded border border-blue-700 text-blue-200">
                    {typeIcons[d.type]} {d.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-slate-400">
            <div>第一次检测: {detection.firstPassResults.length} 项</div>
            <div>第二次检测: {detection.secondPassResults.length} 项</div>
            <div>新增: {comparison.added.length} 项</div>
            <div>受影响: {comparison.changed.length} 项</div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {currentResults.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">暂无检测结果</p>
            <p className="text-slate-500 text-xs mt-1">点击左侧"开始检测"按钮</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentResults.map(detection => (
              <DetectionItem
                key={detection.id}
                detection={detection}
                isSelected={ui.selectedDetectionId === detection.id}
                onClick={() => setSelectedDetectionId(
                  ui.selectedDetectionId === detection.id ? null : detection.id
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="text-xs font-semibold text-slate-400 mb-2">图例说明</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-600" />
            <span className="text-slate-400">高危</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-orange-500" />
            <span className="text-slate-400">中危</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-slate-400">低危</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-slate-400">受路线影响</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            <div>📐 坐标偏移</div>
            <div>🔧 支护缺失</div>
            <div>📡 传感器异常</div>
          </div>
        </div>
      </div>
    </div>
  );
}
