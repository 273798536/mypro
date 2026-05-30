import { useAppStore } from '../store/appStore';
import { History, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

export default function ChangeHistory() {
  const { viewpointHistory, setComparisonMode, comparisonMode } = useAppStore();

  if (viewpointHistory.length === 0) {
    return (
      <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C]">
        <h3 className="text-sm font-semibold text-[#F5F0E8] mb-2 font-['DM_Sans'] flex items-center gap-2">
          <History size={14} className="text-[#D4A843]" />
          变更历史
        </h3>
        <p className="text-sm text-gray-400 text-center py-4">暂无变更记录</p>
        <p className="text-xs text-gray-500 text-center">修改乐器声压后会在此记录</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C]">
      <h3 className="text-sm font-semibold text-[#F5F0E8] mb-3 font-['DM_Sans'] flex items-center gap-2">
        <History size={14} className="text-[#D4A843]" />
        变更历史
      </h3>

      <div className="mb-3">
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setComparisonMode('current')}
            className={`flex-1 px-2 py-1 rounded ${
              comparisonMode === 'current'
                ? 'bg-[#D4A843] text-[#0a1628]'
                : 'bg-[#1a2d4a] text-gray-400 hover:text-[#F5F0E8]'
            }`}
          >
            当前
          </button>
          <button
            onClick={() => setComparisonMode('before')}
            className={`flex-1 px-2 py-1 rounded ${
              comparisonMode === 'before'
                ? 'bg-[#D4A843] text-[#0a1628]'
                : 'bg-[#1a2d4a] text-gray-400 hover:text-[#F5F0E8]'
            }`}
          >
            变更前
          </button>
          <button
            onClick={() => setComparisonMode('both')}
            className={`flex-1 px-2 py-1 rounded ${
              comparisonMode === 'both'
                ? 'bg-[#D4A843] text-[#0a1628]'
                : 'bg-[#1a2d4a] text-gray-400 hover:text-[#F5F0E8]'
            }`}
          >
            对比
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {viewpointHistory.slice(0, 10).map((change) => {
          const diff = change.newValue - (change.oldValue ?? 0);
          const isUp = diff > 0;
          return (
            <div key={change.id} className="p-2 bg-[#1a2d4a] rounded">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#F5F0E8]">
                  {change.musicianName} - {change.instrument}
                </span>
                <span className="text-gray-500">
                  {new Date(change.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 line-through">
                    {change.oldValue !== null ? `${change.oldValue} dB` : '缺失'}
                  </span>
                  <ArrowRight size={10} className="text-gray-500" />
                  <span className="text-[#F5F0E8]">{change.newValue} dB</span>
                </div>
                <div className={`flex items-center gap-0.5 text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {isUp ? '+' : ''}{diff} dB
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
