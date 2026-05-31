
import { Play, Square, RotateCcw, Plus, Trash2, Settings } from 'lucide-react';
import { Drone, Waypoint } from '@/types';
import { Drones } from '@/constants';

interface ControlPanelProps {
  selectedDroneId: string;
  pilotName: string;
  waypoints: Waypoint[];
  isFlying: boolean;
  onDroneChange: (id: string) => void;
  onPilotNameChange: (name: string) => void;
  onStartFlight: () => void;
  onEndFlight: () => void;
  onReset: () => void;
  onAddWaypoint: () => void;
  onRemoveWaypoint: (id: string) => void;
}

export default function ControlPanel({
  selectedDroneId,
  pilotName,
  waypoints,
  isFlying,
  onDroneChange,
  onPilotNameChange,
  onStartFlight,
  onEndFlight,
  onReset,
  onAddWaypoint,
  onRemoveWaypoint
}: ControlPanelProps) {
  const selectedDrone = Drones.find(d => d.id === selectedDroneId);

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        飞行控制
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">选择无人机</label>
          <select
            value={selectedDroneId}
            onChange={(e) => onDroneChange(e.target.value)}
            disabled={isFlying}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          >
            {Drones.map(drone => (
              <option key={drone.id} value={drone.id}>
                {drone.name} ({drone.maxBattery}mAh)
              </option>
            ))}
          </select>
          {selectedDrone && (
            <div className="mt-2 text-xs text-slate-500 grid grid-cols-2 gap-2">
              <span>巡航: {selectedDrone.cruiseSpeed}m/s</span>
              <span>功耗: {selectedDrone.baseConsumption}mAh/s</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">飞行员姓名</label>
          <input
            type="text"
            value={pilotName}
            onChange={(e) => onPilotNameChange(e.target.value)}
            disabled={isFlying}
            placeholder="请输入姓名"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-400">航点列表 ({waypoints.length}/8)</label>
            <button
              onClick={onAddWaypoint}
              disabled={isFlying || waypoints.length >= 8}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
              添加
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {waypoints.map((wp, index) => (
              <div 
                key={wp.id}
                className="flex items-center justify-between bg-slate-900/50 rounded px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    wp.type === 'start' ? 'bg-green-500' :
                    wp.type === 'end' ? 'bg-orange-500' :
                    'bg-cyan-500'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-slate-300">{wp.name}</span>
                </div>
                {wp.type === 'checkpoint' && !isFlying && (
                  <button
                    onClick={() => onRemoveWaypoint(wp.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {!isFlying ? (
            <button
              onClick={onStartFlight}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
            >
              <Play className="w-4 h-4" />
              开始飞行
            </button>
          ) : (
            <button
              onClick={onEndFlight}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20"
            >
              <Square className="w-4 h-4" />
              结束飞行
            </button>
          )}
          <button
            onClick={onReset}
            disabled={isFlying}
            className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
