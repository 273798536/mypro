import { useGameStore } from '@/store/gameStore';
import { computeGrade } from '@/engine/gameEngine';
import { Trophy, RotateCcw, Film, CheckCircle, XCircle, AlertTriangle, BatteryWarning } from 'lucide-react';

function AnimatedCounter({ value, label, icon: Icon, color }: {
  value: number;
  label: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon size={16} className={color} />
      <span className={`font-mono text-xl font-bold ${color}`}>{value}</span>
      <span className="text-zinc-500 text-xs">{label}</span>
    </div>
  );
}

export default function SettlementPanel() {
  const phase = useGameStore(s => s.state.phase);
  const score = useGameStore(s => s.state.score);
  const totalCompleted = useGameStore(s => s.state.totalCompleted);
  const totalTimeout = useGameStore(s => s.state.totalTimeout);
  const totalCollisions = useGameStore(s => s.state.totalCollisions);
  const totalDepletions = useGameStore(s => s.state.totalDepletions);
  const orders = useGameStore(s => s.state.orders);
  const restart = useGameStore(s => s.restart);
  const startReplay = useGameStore(s => s.startReplay);

  if (phase !== 'settled') return null;

  const grade = computeGrade(score);
  const totalOrders = orders.length;
  const completionRate = totalOrders > 0 ? Math.round((totalCompleted / totalOrders) * 100) : 0;

  const gradeColors: Record<string, string> = {
    S: 'text-yellow-400',
    A: 'text-green-400',
    B: 'text-blue-400',
    C: 'text-zinc-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#12121f] border border-zinc-700 rounded-2xl p-8 max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Trophy size={24} className="text-orange-400" />
          <h2 className="text-white text-xl font-bold">结算</h2>
        </div>

        <div className="flex items-center justify-center mb-6">
          <div className={`text-7xl font-bold ${gradeColors[grade]}`} style={{
            textShadow: `0 0 30px ${grade === 'S' ? '#facc15' : grade === 'A' ? '#4ade80' : '#60a5fa'}40`,
          }}>
            {grade}
          </div>
        </div>

        <div className="text-center mb-6">
          <span className="text-zinc-400 text-sm">最终得分</span>
          <div className="text-white text-3xl font-mono font-bold">{score}</div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <AnimatedCounter
            value={completionRate}
            label="完成率%"
            icon={CheckCircle}
            color="text-green-400"
          />
          <AnimatedCounter
            value={totalTimeout}
            label="超时数"
            icon={XCircle}
            color="text-red-400"
          />
          <AnimatedCounter
            value={totalCollisions}
            label="碰撞次数"
            icon={AlertTriangle}
            color="text-yellow-400"
          />
          <AnimatedCounter
            value={totalDepletions}
            label="电量枯竭"
            icon={BatteryWarning}
            color="text-orange-400"
          />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={startReplay}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            <Film size={14} />
            复盘
          </button>
          <button
            onClick={restart}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors"
          >
            <RotateCcw size={14} />
            再来一局
          </button>
        </div>
      </div>
    </div>
  );
}
