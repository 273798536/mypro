
import { useDataStore } from '../../store/useDataStore';
import { useSceneStore } from '../../store/useSceneStore';
import { MapPin, Clock, AlertTriangle, Info } from 'lucide-react';

export function StatusBar() {
  const problems = useDataStore(state => state.problems);
  const beacons = useDataStore(state => state.beacons);
  const trajectories = useDataStore(state => state.trajectories);
  const selectedObject = useSceneStore(state => state.selectedObject);
  const isPlaying = useSceneStore(state => state.isPlaying);
  const playbackTime = useSceneStore(state => state.playbackTime);
  
  const getSelectedObjectInfo = () => {
    if (!selectedObject) return null;
    
    switch (selectedObject.type) {
      case 'beacon':
        const beacon = beacons.find(b => b.id === selectedObject.id);
        if (beacon) {
          return {
            type: '信标设备',
            name: beacon.name,
            info: `MAC: ${beacon.mac} | RSSI: ${beacon.signalStrength} dBm`
          };
        }
        break;
      case 'trajectory':
        const point = trajectories.find(t => t.id === selectedObject.id);
        if (point) {
          return {
            type: '定位点',
            name: `(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`,
            info: `楼层: ${point.floorId} | 时间: ${new Date(point.timestamp).toLocaleTimeString()}`
          };
        }
        break;
      case 'problem':
        const problem = problems.find(p => p.id === selectedObject.id);
        if (problem) {
          return {
            type: '问题点',
            name: problem.title,
            info: `严重程度: ${problem.severity === 'high' ? '严重' : problem.severity === 'medium' ? '中等' : '轻微'}`
          };
        }
        break;
    }
    return null;
  };
  
  const selectedInfo = getSelectedObjectInfo();
  
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <div className="mx-4 mb-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {selectedInfo ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Info className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-cyan-400 text-xs font-bold">{selectedInfo.type}: {selectedInfo.name}</div>
                <div className="text-gray-400 text-xs">{selectedInfo.info}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-xs">点击3D视图中的对象查看详情</div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {isPlaying && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs">回放中 {Math.round(playbackTime * 100)}%</span>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>{beacons.length} 信标</span>
            </div>
            <div className="flex items-center gap-1.5 text-green-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{trajectories.length} 轨迹点</span>
            </div>
            <div className={`flex items-center gap-1.5 ${problems.length > 0 ? 'text-red-400' : 'text-gray-500'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{problems.length} 问题</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

