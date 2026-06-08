import { useState } from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  Clock, 
  Target, 
  CheckCircle, 
  XCircle,
  Play,
  SkipBack,
  SkipForward,
  ZoomIn,
  List,
  Activity
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { detectCollisions, formatDistance } from '../../utils/dataProcessing';
import type { CollisionEvent, MeasurementRecord } from '../../types';

export default function ReplayPanel() {
  const { 
    pointCloudData, 
    measurements, 
    collisions,
    timeState,
    setTime,
    selectDefect,
    clearSelection,
    setTimeState,
    play,
    pause
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'collisions' | 'measurements' | 'timeline'>('overview');

  if (!pointCloudData) {
    return (
      <div className="bg-gray-900 bg-opacity-95 rounded-lg p-4 backdrop-blur-sm border border-indigo-900">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <span className="text-indigo-400 text-sm font-medium">结算复盘</span>
        </div>
        <div className="text-center text-gray-500 text-sm py-4">
          请先导入点云数据
        </div>
      </div>
    );
  }

  const allDefects = pointCloudData.points;
  const defectsByType = allDefects.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const directUseCount = measurements.filter(m => m.status === 'direct_use').length;
  const needsReviewCount = measurements.filter(m => m.status === 'needs_review').length;

  const allCollisions: CollisionEvent[] = collisions.length > 0 
    ? collisions 
    : detectCollisions(allDefects, 0.5);

  const highCollisions = allCollisions.filter(c => c.severity === 'high');
  const mediumCollisions = allCollisions.filter(c => c.severity === 'medium');
  const lowCollisions = allCollisions.filter(c => c.severity === 'low');

  const handleJumpToCollision = (collision: CollisionEvent) => {
    setTime(collision.time);
    setTimeState({ isPlaying: false });
    clearSelection();
    selectDefect(collision.defect1);
    selectDefect(collision.defect2);
  };

  const handleJumpToMeasurement = (measurement: MeasurementRecord) => {
    clearSelection();
    measurement.defectIds.forEach(id => selectDefect(id));
  };

  const handleJumpToTime = (time: number) => {
    setTime(time);
    setTimeState({ isPlaying: false });
  };

  return (
    <div className="bg-gray-900 bg-opacity-95 rounded-lg p-4 backdrop-blur-sm border border-indigo-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <span className="text-indigo-400 text-sm font-medium">结算复盘</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setTime(0)}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            title="回到开始"
          >
            <SkipBack className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            onClick={() => timeState.isPlaying ? pause() : play()}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
            title={timeState.isPlaying ? '暂停' : '播放'}
          >
            {timeState.isPlaying ? (
              <Clock className="w-3.5 h-3.5 text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white" />
            )}
          </button>
          <button
            onClick={() => setTime(timeState.totalDuration)}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            title="跳到结尾"
          >
            <SkipForward className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex space-x-1 mb-4">
        {(['overview', 'collisions', 'measurements', 'timeline'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab === 'overview' && '概览'}
            {tab === 'collisions' && `碰撞(${allCollisions.length})`}
            {tab === 'measurements' && `测量(${measurements.length})`}
            {tab === 'timeline' && '时间线'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">缺陷总数</div>
              <div className="text-xl font-bold text-cyan-400">{allDefects.length}</div>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">碰撞事件</div>
              <div className={`text-xl font-bold ${allCollisions.length > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {allCollisions.length}
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">缺陷类型分布</div>
            <div className="space-y-1.5">
              {Object.entries(defectsByType).map(([type, count]) => (
                <div key={type} className="flex items-center space-x-2">
                  <span className="text-xs text-gray-300 w-24 capitalize">{type}</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 to-cyan-400 rounded-full"
                      style={{ width: `${(count / allDefects.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-mono w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-800">
              <div className="flex items-center space-x-1 mb-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-400">可直接使用</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{directUseCount}</div>
            </div>
            <div className="p-3 bg-orange-900 bg-opacity-30 rounded-lg border border-orange-800">
              <div className="flex items-center space-x-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs text-orange-400">需复核</span>
              </div>
              <div className="text-2xl font-bold text-orange-400">{needsReviewCount}</div>
            </div>
          </div>

          {allCollisions.length > 0 && (
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-400 mb-2">碰撞严重程度</div>
              <div className="flex space-x-2">
                <div className="flex-1 p-2 bg-red-900 bg-opacity-30 rounded border border-red-800 text-center">
                  <div className="text-lg font-bold text-red-400">{highCollisions.length}</div>
                  <div className="text-xs text-red-400">高</div>
                </div>
                <div className="flex-1 p-2 bg-orange-900 bg-opacity-30 rounded border border-orange-800 text-center">
                  <div className="text-lg font-bold text-orange-400">{mediumCollisions.length}</div>
                  <div className="text-xs text-orange-400">中</div>
                </div>
                <div className="flex-1 p-2 bg-yellow-900 bg-opacity-30 rounded border border-yellow-800 text-center">
                  <div className="text-lg font-bold text-yellow-400">{lowCollisions.length}</div>
                  <div className="text-xs text-yellow-400">低</div>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">数据质量检查</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">空值数据</span>
                {pointCloudData.metadata.nullCount > 0 ? (
                  <span className="text-xs text-red-400 flex items-center space-x-1">
                    <XCircle className="w-3 h-3" />
                    <span>{pointCloudData.metadata.nullCount} 个</span>
                  </span>
                ) : (
                  <span className="text-xs text-green-400 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>正常</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">重复数据</span>
                {pointCloudData.metadata.duplicateCount > 0 ? (
                  <span className="text-xs text-orange-400 flex items-center space-x-1">
                    <XCircle className="w-3 h-3" />
                    <span>{pointCloudData.metadata.duplicateCount} 个</span>
                  </span>
                ) : (
                  <span className="text-xs text-green-400 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>正常</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">含备注项</span>
                <span className="text-xs text-cyan-400 flex items-center space-x-1">
                  <List className="w-3 h-3" />
                  <span>{pointCloudData.metadata.noteCount} 个</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'collisions' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {allCollisions.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              未检测到碰撞事件
            </div>
          ) : (
            allCollisions.map((collision, index) => (
              <div
                key={collision.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-750 ${
                  collision.severity === 'high' 
                    ? 'bg-red-900 bg-opacity-20 border-red-800 hover:bg-red-900 hover:bg-opacity-30'
                    : collision.severity === 'medium'
                    ? 'bg-orange-900 bg-opacity-20 border-orange-800 hover:bg-orange-900 hover:bg-opacity-30'
                    : 'bg-yellow-900 bg-opacity-20 border-yellow-800 hover:bg-yellow-900 hover:bg-opacity-30'
                }`}
                onClick={() => handleJumpToCollision(collision)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`w-4 h-4 ${
                      collision.severity === 'high' ? 'text-red-400' :
                      collision.severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'
                    }`} />
                    <span className="text-xs text-gray-300 font-medium">碰撞 #{index + 1}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    collision.severity === 'high' ? 'bg-red-600 text-white' :
                    collision.severity === 'medium' ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-white'
                  }`}>
                    {collision.severity === 'high' ? '高风险' :
                     collision.severity === 'medium' ? '中风险' : '低风险'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-400">
                    缺陷1: <span className="text-gray-300">{collision.defect1}</span>
                  </div>
                  <div className="text-gray-400">
                    缺陷2: <span className="text-gray-300">{collision.defect2}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-gray-400">
                    距离: <span className="text-cyan-400 font-mono">{formatDistance(collision.distance)}</span>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>t = {collision.time.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'measurements' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {measurements.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              暂无测量记录
            </div>
          ) : (
            measurements.map((measurement, index) => (
              <div
                key={measurement.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  measurement.status === 'direct_use'
                    ? 'bg-green-900 bg-opacity-20 border-green-800 hover:bg-green-900 hover:bg-opacity-30'
                    : 'bg-orange-900 bg-opacity-20 border-orange-800 hover:bg-orange-900 hover:bg-opacity-30'
                }`}
                onClick={() => handleJumpToMeasurement(measurement)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Target className={`w-4 h-4 ${
                      measurement.status === 'direct_use' ? 'text-green-400' : 'text-orange-400'
                    }`} />
                    <span className="text-xs text-gray-300 font-medium">测量 #{index + 1}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    measurement.status === 'direct_use' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-orange-600 text-white'
                  }`}>
                    {measurement.status === 'direct_use' ? '可直接使用' : '需复核'}
                  </span>
                </div>
                <div className="text-lg text-cyan-400 font-mono mb-1">
                  {formatDistance(measurement.distance)}
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  关联缺陷: <span className="text-gray-300">{measurement.defectIds.join(', ')}</span>
                </div>
                {measurement.conclusion && (
                  <div className="text-xs text-gray-300 mt-2 p-2 bg-gray-800 bg-opacity-50 rounded">
                    <span className="text-gray-500">结论:</span> {measurement.conclusion}
                  </div>
                )}
                {measurement.notes && !measurement.conclusion && (
                  <div className="text-xs text-orange-300 mt-2">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {measurement.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-3">
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">当前时间</span>
              <span className="text-sm text-cyan-400 font-mono">
                {timeState.currentTime.toFixed(1)}s / {timeState.totalDuration.toFixed(1)}s
              </span>
            </div>
            <div 
              className="h-3 bg-gray-700 rounded-full cursor-pointer relative overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                handleJumpToTime(percentage * timeState.totalDuration);
              }}
            >
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-cyan-400 rounded-full"
                style={{ width: `${(timeState.currentTime / timeState.totalDuration) * 100}%` }}
              />
              {allCollisions.map((c) => (
                <div
                  key={c.id}
                  className={`absolute top-0 w-1 h-full ${
                    c.severity === 'high' ? 'bg-red-500' :
                    c.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`}
                  style={{ left: `${(c.time / timeState.totalDuration) * 100}%` }}
                  title={`碰撞 t=${c.time.toFixed(1)}s`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="text-xs text-gray-400 mb-1 flex items-center space-x-1">
              <Activity className="w-3 h-3" />
              <span>关键事件</span>
            </div>
            
            {allCollisions.length === 0 && measurements.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                暂无关键事件
              </div>
            ) : (
              [...allCollisions.map(c => ({ ...c, type: 'collision' as const })),
               ...measurements.map(m => ({ ...m, type: 'measurement' as const, time: 0 }))]
                .sort((a, b) => {
                  if (a.type === 'collision' && b.type === 'collision') return a.time - b.time;
                  if (a.type === 'collision') return -1;
                  if (b.type === 'collision') return 1;
                  return 0;
                })
                .map((event) => (
                  <div
                    key={event.type === 'collision' ? event.id : (event as MeasurementRecord).id}
                    className="flex items-start space-x-3 p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-750 transition-colors"
                    onClick={() => {
                      if (event.type === 'collision') {
                        handleJumpToCollision(event as CollisionEvent);
                      } else {
                        handleJumpToMeasurement(event as MeasurementRecord);
                      }
                    }}
                  >
                    <div className="flex flex-col items-center">
                      {event.type === 'collision' ? (
                        <AlertTriangle className={`w-4 h-4 ${
                          (event as CollisionEvent).severity === 'high' ? 'text-red-400' :
                          (event as CollisionEvent).severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'
                        }`} />
                      ) : (
                        <Target className={`w-4 h-4 ${
                          (event as MeasurementRecord).status === 'direct_use' ? 'text-green-400' : 'text-orange-400'
                        }`} />
                      )}
                      <div className="w-px h-4 bg-gray-700 mt-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300 font-medium">
                          {event.type === 'collision' 
                            ? `碰撞事件` 
                            : `测量记录`}
                        </span>
                        {event.type === 'collision' && (
                          <span className="text-xs text-gray-500 font-mono">
                            t = {(event as CollisionEvent).time.toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {event.type === 'collision' 
                          ? `${(event as CollisionEvent).defect1} ↔ ${(event as CollisionEvent).defect2}`
                          : `距离: ${formatDistance((event as MeasurementRecord).distance)}`}
                      </div>
                    </div>
                    <ZoomIn className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
