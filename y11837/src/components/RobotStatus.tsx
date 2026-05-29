import { useGameStore } from '@/store/gameStore';
import { Battery, MapPin, Clock } from 'lucide-react';

function getBatteryColor(battery: number): string {
  if (battery > 60) return 'bg-green-500';
  if (battery > 30) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getStateLabel(state: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    idle: { label: '空闲', color: 'text-zinc-400' },
    moving_to_shelf: { label: '前往货架', color: 'text-blue-400' },
    picking: { label: '拣货中', color: 'text-yellow-400' },
    moving_to_dispatch: { label: '前往发货', color: 'text-purple-400' },
    delivering: { label: '交付中', color: 'text-green-400' },
    charging: { label: '充电中', color: 'text-green-300' },
    blocked: { label: '堵塞', color: 'text-red-400' },
    collision_cooldown: { label: '碰撞恢复', color: 'text-red-500' },
  };
  return map[state] || { label: state, color: 'text-zinc-400' };
}

export default function RobotStatus() {
  const robots = useGameStore(s => s.state.robots);
  const orders = useGameStore(s => s.state.orders);

  return (
    <div className="flex flex-col gap-2">
      {robots.map(robot => {
        const stateInfo = getStateLabel(robot.state);
        const order = orders.find(o => o.id === robot.currentOrderId);

        return (
          <div
            key={robot.id}
            className="rounded-lg p-3 border"
            style={{
              backgroundColor: '#1a1a2e',
              borderColor: robot.color + '40',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: robot.color }}
              />
              <span className="text-white font-semibold text-sm">{robot.name}</span>
              <span className={`text-xs ${stateInfo.color}`}>{stateInfo.label}</span>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <Battery size={12} className="text-zinc-500" />
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getBatteryColor(robot.battery)}`}
                  style={{ width: `${robot.battery}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400 font-mono w-10 text-right">
                {Math.round(robot.battery)}%
              </span>
            </div>

            {robot.battery < 20 && (
              <div className="text-xs text-red-400 mb-1 animate-pulse">
                ⚠ 低电量警告
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <MapPin size={10} />
                <span>({robot.position.x},{robot.position.y})</span>
              </div>
              {order && (
                <div className="flex items-center gap-1">
                  <Clock size={10} />
                  <span>{order.id}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
