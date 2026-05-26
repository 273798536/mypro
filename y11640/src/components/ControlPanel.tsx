import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { AlertTriangle, Wifi, MapPin, Volume2, Pause, Play, RotateCcw } from 'lucide-react';

const BROADCAST_OPTIONS = [
  { id: 'b1', type: 'emergency' as const, content: '请从A出口紧急疏散！' },
  { id: 'b2', type: 'emergency' as const, content: '请从B出口紧急疏散！' },
  { id: 'b3', type: 'warning' as const, content: '请注意脚下安全，有序通行' },
  { id: 'b4', type: 'warning' as const, content: '前方通道拥挤，请绕行' },
  { id: 'b5', type: 'info' as const, content: '设备维护中，感谢您的配合' },
  { id: 'b6', type: 'info' as const, content: '欢迎光临，祝您旅途愉快' },
];

export function ControlPanel() {
  const gates = useGameStore(state => state.gates);
  const areas = useGameStore(state => state.areas);
  const toggleGate = useGameStore(state => state.toggleGate);
  const toggleArea = useGameStore(state => state.toggleArea);
  const sendBroadcast = useGameStore(state => state.sendBroadcast);
  const pauseGame = useGameStore(state => state.pauseGame);
  const resumeGame = useGameStore(state => state.resumeGame);
  const resetGame = useGameStore(state => state.resetGame);
  const isPaused = useGameStore(state => state.isPaused);
  const currentEvent = useGameStore(state => state.currentEvent);
  const [customBroadcast, setCustomBroadcast] = useState('');

  const handleSendCustomBroadcast = () => {
    if (customBroadcast.trim()) {
      sendBroadcast(customBroadcast, 'info');
      setCustomBroadcast('');
    }
  };

  return (
    <div className="space-y-4">
      {currentEvent && (
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span>紧急事件</span>
          </div>
          <p className="text-red-300 text-sm">{currentEvent.description}</p>
          {currentEvent.affectedGates.length > 0 && (
            <p className="text-red-400 text-xs mt-1">
              受影响闸机: {currentEvent.affectedGates.join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          闸机控制
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {gates.map(gate => (
            <button
              key={gate.id}
              onClick={() => toggleGate(gate.id)}
              className={`p-2 rounded text-sm font-medium transition-all ${
                gate.status === 'open'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : gate.status === 'fault'
                  ? 'bg-red-600 text-white cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
              }`}
              disabled={gate.status === 'fault'}
            >
              {gate.name}
              <span className="block text-xs opacity-75">
                {gate.status === 'open' ? '开启' : gate.status === 'fault' ? '故障' : '关闭'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          区域管理
        </h3>
        <div className="space-y-2">
          {areas.map(area => (
            <button
              key={area.id}
              onClick={() => toggleArea(area.id)}
              className={`w-full p-2 rounded text-sm font-medium transition-all flex justify-between items-center ${
                area.blocked
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <span>{area.name}</span>
              <span className="text-xs opacity-75">
                {area.blocked ? '已封闭' : '开放中'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          广播系统
        </h3>
        <div className="space-y-2 mb-3">
          {BROADCAST_OPTIONS.map(option => (
            <button
              key={option.id}
              onClick={() => sendBroadcast(option.content, option.type)}
              className={`w-full p-2 rounded text-sm text-left transition-all ${
                option.type === 'emergency'
                  ? 'bg-red-800 hover:bg-red-700 text-red-100'
                  : option.type === 'warning'
                  ? 'bg-yellow-800 hover:bg-yellow-700 text-yellow-100'
                  : 'bg-blue-800 hover:bg-blue-700 text-blue-100'
              }`}
            >
              <span className="font-medium">
                [{option.type === 'emergency' ? '紧急' : option.type === 'warning' ? '警告' : '提示'}]
              </span>{' '}
              {option.content}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customBroadcast}
            onChange={e => setCustomBroadcast(e.target.value)}
            placeholder="自定义广播内容..."
            className="flex-1 px-3 py-2 bg-gray-700 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendCustomBroadcast}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium"
          >
            发送
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">游戏控制</h3>
        <div className="flex gap-2">
          <button
            onClick={isPaused ? resumeGame : pauseGame}
            className="flex-1 p-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? '继续' : '暂停'}
          </button>
          <button
            onClick={resetGame}
            className="flex-1 p-2 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
