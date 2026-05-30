import { useState } from 'react';
import { useAppStore } from '@/store';
import Scene3D from '@/components/three/Scene3D';
import ConflictCard from '@/components/ui/ConflictCard';
import StatusBadge from '@/components/ui/StatusBadge';
import Timeline from '@/components/ui/Timeline';
import { Play, X, User, Calendar, Database, Crosshair, Video } from 'lucide-react';

export default function MainWorkspace() {
  const {
    cameras,
    conflicts,
    selectedCameraId,
    cameraHistories,
    cameraRoutes,
    updateConflictStatus,
  } = useAppStore();
  
  const [playingRouteId, setPlayingRouteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved' | 'accepted'>('pending');
  const [filterType, setFilterType] = useState<'all' | 'position' | 'occlusion' | 'boundary'>('all');
  
  const selectedCamera = cameras.find(c => c.id === selectedCameraId);
  const selectedCameraHistory = cameraHistories.filter(h => h.cameraId === selectedCameraId);
  
  const filteredConflicts = conflicts.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    return true;
  });
  
  const pendingCount = conflicts.filter(c => c.status === 'pending').length;
  const criticalCount = conflicts.filter(c => c.severity === 'critical' && c.status === 'pending').length;
  
  const handlePlayRoute = (routeId: string) => {
    setPlayingRouteId(playingRouteId === routeId ? null : routeId);
  };
  
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 bg-gray-900/50 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm mb-3">机位冲突</h2>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-800/50 rounded p-2 text-center">
              <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
              <div className="text-xs text-gray-500">严重</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2 text-center">
              <div className="text-2xl font-bold text-orange-400">{pendingCount}</div>
              <div className="text-xs text-gray-500">待处理</div>
            </div>
          </div>
          
          <div className="flex gap-1 mb-2">
            {(['all', 'pending', 'resolved', 'accepted'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  filterStatus === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {s === 'all' ? '全部' : s === 'pending' ? '待处理' : s === 'resolved' ? '已解决' : '已接受'}
              </button>
            ))}
          </div>
          
          <div className="flex gap-1">
            {(['all', 'position', 'occlusion', 'boundary'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  filterType === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {t === 'all' ? '全部' : t === 'position' ? '位置' : t === 'occlusion' ? '遮挡' : '越界'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredConflicts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无冲突记录
            </div>
          ) : (
            filteredConflicts.map(conflict => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                cameras={cameras}
              />
            ))
          )}
        </div>
      </div>
      
      <div className="flex-1 relative">
        <Scene3D playingRouteId={playingRouteId} />
        
        {cameraRoutes.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">运动路线</div>
            {cameraRoutes.map(route => {
              const cam = cameras.find(c => c.id === route.cameraId);
              return (
                <div key={route.id} className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlayRoute(route.id)}
                    className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-all ${
                      playingRouteId === route.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    {cam?.number}号 · {route.description}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="w-80 bg-gray-900/50 border-l border-gray-800 flex flex-col">
        {selectedCamera ? (
          <>
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white font-semibold text-sm">机位详情</h2>
                <span className="text-2xl font-bold text-blue-400">{selectedCamera.number}</span>
              </div>
              <h3 className="text-white font-medium">{selectedCamera.name}</h3>
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <User className="w-3 h-3" />
                {selectedCamera.operator}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">位置参数</h4>
                <div className="bg-gray-800/50 rounded p-3 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">X:</span>
                    <span className="text-cyan-400">{selectedCamera.position.x.toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Y:</span>
                    <span className="text-green-400">{selectedCamera.position.y.toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Z:</span>
                    <span className="text-purple-400">{selectedCamera.position.z.toFixed(2)}m</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">朝向参数</h4>
                <div className="bg-gray-800/50 rounded p-3 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pan:</span>
                    <span className="text-yellow-400">{selectedCamera.rotation.pan.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tilt:</span>
                    <span className="text-orange-400">{selectedCamera.rotation.tilt.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Roll:</span>
                    <span className="text-red-400">{selectedCamera.rotation.roll.toFixed(1)}°</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">镜头参数</h4>
                <div className="bg-gray-800/50 rounded p-3 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">焦距:</span>
                    <span className="text-blue-400">{selectedCamera.lens.focalLength}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">FOV:</span>
                    <span className="text-cyan-400">{selectedCamera.lens.fov}°</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">来源信息</h4>
                <div className="bg-gray-800/50 rounded p-3 text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-300">{selectedCamera.source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-400 text-xs">
                      {new Date(selectedCamera.updatedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
              
              {conflicts.filter(c => (c.cameraAId === selectedCamera.id || c.cameraBId === selectedCamera.id) && c.status === 'pending').length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">相关冲突</h4>
                  <div className="space-y-2">
                    {conflicts
                      .filter(c => (c.cameraAId === selectedCamera.id || c.cameraBId === selectedCamera.id) && c.status === 'pending')
                      .map(conflict => (
                        <div key={conflict.id} className="bg-gray-800/50 rounded p-3 border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusBadge type="conflictType" value={conflict.type} size="sm" />
                            <StatusBadge type="severity" value={conflict.severity} size="sm" />
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{conflict.humanDescription}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateConflictStatus(conflict.id, 'resolved')}
                              className="flex-1 px-2 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-xs transition-all"
                            >
                              标记解决
                            </button>
                            <button
                              onClick={() => updateConflictStatus(conflict.id, 'accepted')}
                              className="flex-1 px-2 py-1 bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 rounded text-xs transition-all"
                            >
                              接受风险
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">修改历史</h4>
                <Timeline history={selectedCameraHistory} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6">
            <Crosshair className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm text-center">点击3D场景中的机位<br/>查看详细信息</p>
            <div className="mt-6 space-y-3 w-full">
              <div className="bg-gray-800/30 rounded p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Video className="w-4 h-4" />
                  <span>机位列表</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {cameras.map(cam => {
                    const hasConflict = conflicts.some(
                      c => c.status === 'pending' && (c.cameraAId === cam.id || c.cameraBId === cam.id)
                    );
                    return (
                      <button
                        key={cam.id}
                        onClick={() => useAppStore.getState().setSelectedCamera(cam.id)}
                        className={`py-2 text-xs font-bold rounded transition-all ${
                          hasConflict 
                            ? 'bg-red-600/30 text-red-400 border border-red-500/30' 
                            : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                        }`}
                      >
                        {cam.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
