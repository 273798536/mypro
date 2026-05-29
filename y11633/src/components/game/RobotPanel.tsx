import { Bot, Battery, Zap, AlertTriangle } from 'lucide-react';
import type { Robot } from '../../types';
import { useGameStore } from '../../store/gameStore';

interface RobotPanelProps {
  robots: Robot[];
  selectedRobotId: string | null;
  onSelectRobot: (id: string | null) => void;
}

const statusLabels: Record<Robot['status'], string> = {
  idle: '空闲',
  moving: '移动中',
  charging: '充电中',
  picking: '拣货中',
  blocked: '被阻挡',
  low_battery: '低电量',
};

const statusColors: Record<Robot['status'], string> = {
  idle: 'bg-green-500',
  moving: 'bg-blue-500',
  charging: 'bg-yellow-500',
  picking: 'bg-purple-500',
  blocked: 'bg-red-500',
  low_battery: 'bg-orange-500',
};

export function RobotPanel({ robots, selectedRobotId, onSelectRobot }: RobotPanelProps) {
  const sendRobotToCharge = useGameStore(state => state.sendRobotToCharge);

  return (
    <div className="bg-slate-800 rounded-xl p-4 shadow-xl">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Bot className="w-5 h-5 text-blue-400" />
        机器人列表
      </h3>
      <div className="space-y-3">
        {robots.map(robot => {
          const isSelected = robot.id === selectedRobotId;
          const batteryColor =
            robot.battery > 50
              ? 'text-green-400'
              : robot.battery > 20
              ? 'text-yellow-400'
              : 'text-red-400';

          return (
            <div
              key={robot.id}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-600 border-2 border-blue-400'
                  : 'bg-slate-700 hover:bg-slate-600 border-2 border-transparent'
              }`}
              onClick={() => onSelectRobot(isSelected ? null : robot.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{robot.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs text-white ${statusColors[robot.status]}`}
                >
                  {statusLabels[robot.status]}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Battery className={`w-4 h-4 ${batteryColor}`} />
                <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      robot.battery > 50
                        ? 'bg-green-500'
                        : robot.battery > 20
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${robot.battery}%` }}
                  />
                </div>
                <span className={`text-xs font-mono ${batteryColor}`}>
                  {robot.battery.toFixed(0)}%
                </span>
              </div>
              {robot.currentOrderId && (
                <div className="text-xs text-slate-300 mb-2">
                  执行订单: {robot.currentOrderId.slice(0, 10)}
                </div>
              )}
              {(robot.status === 'idle' || robot.status === 'low_battery') && robot.battery < 50 && (
                <button
                  className="w-full mt-2 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
                  onClick={e => {
                    e.stopPropagation();
                    sendRobotToCharge(robot.id);
                  }}
                >
                  <Zap className="w-4 h-4" />
                  派遣充电
                </button>
              )}
              {robot.status === 'low_battery' && (
                <div className="mt-2 flex items-center gap-1 text-orange-400 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  电量过低，无法接单，请派遣充电
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
