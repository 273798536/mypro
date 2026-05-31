import { useEffect, useRef } from 'react';
import { useSolarSailStore } from '@/store/solarSailStore';
import { Play, Pause, RotateCcw, SkipForward, Download } from 'lucide-react';

export function Timeline() {
  const { isPlaying, setPlaying, stepSimulation, resetSimulation, currentTime, orbitData, params } = useSolarSailStore();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        stepSimulation();
      }, 50);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, stepSimulation]);

  const exportCSV = () => {
    const headers = ['time', 'x', 'y', 'z', 'velocity', 'radiationPressure', 'acceleration'];
    const rows = orbitData.map(point => [
      point.time.toFixed(2),
      point.x.toFixed(4),
      point.y.toFixed(4),
      point.z.toFixed(4),
      point.velocity.toExponential(6),
      point.radiationPressure.toExponential(6),
      point.acceleration.toExponential(6)
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solar_sail_orbit_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying(!isPlaying)}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
              isPlaying 
                ? 'bg-orange-500 hover:bg-orange-400 text-white' 
                : 'bg-teal-500 hover:bg-teal-400 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={stepSimulation}
            className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
            title="单步执行"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={resetSimulation}
            className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
            title="重置"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">模拟时间</span>
            <span className="font-mono text-sm text-white">{formatTime(currentTime)}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-orange-500 transition-all duration-100"
              style={{ width: `${Math.min((orbitData.length / 1000) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>数据点: {orbitData.length}</span>
            <span>步长: {params.timeStep}s</span>
          </div>
        </div>

        <button
          onClick={exportCSV}
          disabled={orbitData.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          导出 CSV
        </button>
      </div>
    </div>
  );
}
