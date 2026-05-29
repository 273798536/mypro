import { useGameStore } from '../store/gameStore';

interface ControlPanelProps {
  selectedBus: string | null;
  onNextRound: () => void;
  onBackToHome: () => void;
  isLastRound: boolean;
}

export default function ControlPanel({
  selectedBus,
  onNextRound,
  onBackToHome,
  isLastRound,
}: ControlPanelProps) {
  const buses = useGameStore(state => state.buses);
  const forceDispatchBus = useGameStore(state => state.forceDispatchBus);
  const assignDriverBreak = useGameStore(state => state.assignDriverBreak);
  const gamePhase = useGameStore(state => state.gamePhase);

  const selectedBusData = selectedBus ? buses.find(b => b.id === selectedBus) : null;

  const handleForceDispatch = () => {
    if (selectedBus) {
      forceDispatchBus(selectedBus);
    }
  };

  const handleAssignBreak = () => {
    if (selectedBus) {
      assignDriverBreak(selectedBus);
    }
  };

  if (gamePhase === 'ended') {
    return (
      <div className="bg-white border-t shadow-lg p-6">
        <div className="max-w-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">🎬</div>
            <h3 className="text-xl font-bold text-gray-800">游戏结束</h3>
            <p className="text-gray-500">正在生成报告...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t shadow-lg p-4">
      <div className="max-w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToHome}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← 返回首页
          </button>

          {selectedBusData && (
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-gray-500">已选择:</span>
              <span className="font-semibold text-traffic-blue">
                {selectedBusData.plateNumber}
              </span>
              <span className="text-sm text-gray-500">
                ({selectedBusData.driverName})
              </span>

              <div className="h-6 w-px bg-gray-300 mx-2"></div>

              <button
                onClick={handleForceDispatch}
                disabled={selectedBusData.status === 'running'}
                className="px-3 py-1 bg-traffic-blue text-white text-sm rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🚀 强制发车
              </button>

              <button
                onClick={handleAssignBreak}
                disabled={selectedBusData.continuousDriving < 2}
                className="px-3 py-1 bg-warning-orange text-white text-sm rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ☕ 安排休息
              </button>

              <span className="text-xs text-gray-400">
                已连续驾驶 {selectedBusData.continuousDriving.toFixed(1)}h
              </span>
            </div>
          )}

          {!selectedBusData && (
            <p className="text-sm text-gray-400">
              💡 点击棋盘上的车辆进行调度操作
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">当前回合操作</p>
            <p className="text-sm text-gray-700">
              点击下一回合模拟车辆运行和客流变化
            </p>
          </div>

          <button
            onClick={onNextRound}
            className="px-8 py-3 bg-safe-green text-white font-bold text-lg rounded-xl hover:bg-green-600 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
          >
            {isLastRound ? '🏁 最后一回合' : '⏭️ 下一回合'}
          </button>
        </div>
      </div>
    </div>
  );
}
