import { useGameStore } from '../store/gameStore';

export default function StatusBar() {
  const currentRound = useGameStore(state => state.currentRound);
  const maxRounds = useGameStore(state => state.maxRounds);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const score = useGameStore(state => state.score);
  const totalPassengersTransported = useGameStore(state => state.totalPassengersTransported);
  const anomalies = useGameStore(state => state.anomalies);

  const formatTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const unresolvedCount = anomalies.filter(a => !a.resolved).length;
  const criticalCount = anomalies.filter(a => a.severity === 'critical' && !a.resolved).length;

  return (
    <div className="bg-white shadow-md px-6 py-4">
      <div className="max-w-full flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-xs text-gray-500">回合进度</p>
              <p className="text-xl font-bold text-traffic-blue">
                {currentRound} / {maxRounds}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl">🕐</span>
            <div>
              <p className="text-xs text-gray-500">当前时间</p>
              <p className="text-xl font-bold text-gray-800">
                {formatTime(timeOfDay)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-xs text-gray-500">当前得分</p>
              <p className={`text-xl font-bold ${score >= 80 ? 'text-safe-green' : score >= 60 ? 'text-warning-orange' : 'text-passenger-red'}`}>
                {score} 分
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <div>
              <p className="text-xs text-gray-500">已运送乘客</p>
              <p className="text-xl font-bold text-safe-green">
                {totalPassengersTransported} 人
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg ${unresolvedCount > 0 ? 'bg-warning-orange text-white' : 'bg-gray-100 text-gray-600'}`}>
            <span className="font-semibold">⚠️ {unresolvedCount} 个异常</span>
            {criticalCount > 0 && (
              <span className="ml-2 bg-passenger-red px-2 py-0.5 rounded text-sm">
                {criticalCount} 严重
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
