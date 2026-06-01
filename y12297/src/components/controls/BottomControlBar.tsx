import { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Palette,
  ShieldAlert,
  AlertTriangle,
  FileWarning,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../../store';
import {
  PRODUCT_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  type ProductType,
  type RiskLevel,
} from '../../../shared/types';

export function BottomControlBar() {
  const {
    filters,
    setFilters,
    timeline,
    setTimeline,
    colorMode,
    toggleColorMode,
    risks,
    products,
    saveToHistory,
  } = useAppStore();

  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeline.playing) {
      const animate = () => {
        setTimeline({
          current: Math.min(
            timeline.current + 86400000 * timeline.speed,
            timeline.endTime
          ),
        });
        if (timeline.current >= timeline.endTime) {
          setTimeline({ playing: false });
        } else {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [timeline.playing, timeline.speed, timeline.current, timeline.endTime, setTimeline]);

  const riskStats = {
    critical: risks.filter((r) => r.severity === 'critical').length,
    warning: risks.filter((r) => r.severity === 'warning').length,
    byType: {
      risk_misalignment: risks.filter((r) => r.type === 'risk_misalignment').length,
      maturity_missing: risks.filter((r) => r.type === 'maturity_missing').length,
      yield_exaggeration: risks.filter((r) => r.type === 'yield_exaggeration').length,
    },
  };

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setTimeline({ current: value, playing: false });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="h-36 bg-space-800/95 backdrop-blur-xl border-t border-space-600 flex flex-col">
      <div className="flex items-center gap-6 px-4 py-2 border-b border-space-600">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">产品类型</span>
          <div className="flex gap-1">
            <button
              onClick={() => setFilters({ type: 'all' })}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.type === 'all'
                  ? 'bg-cyber-500 text-space-900 font-semibold'
                  : 'bg-space-700 text-gray-400 hover:text-white hover:bg-space-600'
              }`}
            >
              全部
            </button>
            {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilters({ type })}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filters.type === type
                    ? 'bg-cyber-500 text-space-900 font-semibold'
                    : 'bg-space-700 text-gray-400 hover:text-white hover:bg-space-600'
                }`}
              >
                {PRODUCT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-space-600" />

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">风险等级</span>
          <div className="flex gap-1">
            <button
              onClick={() => setFilters({ riskLevel: 'all' })}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters.riskLevel === 'all'
                  ? 'bg-cyber-500 text-space-900 font-semibold'
                  : 'bg-space-700 text-gray-400 hover:text-white hover:bg-space-600'
              }`}
            >
              全部
            </button>
            {([1, 2, 3, 4, 5] as RiskLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setFilters({ riskLevel: level })}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filters.riskLevel === level
                    ? 'bg-cyber-500 text-space-900 font-semibold'
                    : 'bg-space-700 text-gray-400 hover:text-white hover:bg-space-600'
                }`}
              >
                R{level}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-space-600" />

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">期限</span>
          <div className="flex gap-1">
            {(['all', 'yes', 'no'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilters({ hasMaturity: value })}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filters.hasMaturity === value
                    ? 'bg-cyber-500 text-space-900 font-semibold'
                    : 'bg-space-700 text-gray-400 hover:text-white hover:bg-space-600'
                }`}
              >
                {value === 'all' ? '全部' : value === 'yes' ? '有期限' : '缺期限'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
              riskStats.critical > 0 ? 'bg-risk-500/20' : 'bg-space-700'
            }`}
          >
            <ShieldAlert
              className={`w-4 h-4 ${
                riskStats.critical > 0 ? 'text-risk-400' : 'text-gray-500'
              }`}
            />
            <span
              className={`text-sm font-mono font-semibold ${
                riskStats.critical > 0 ? 'text-risk-400' : 'text-gray-500'
              }`}
            >
              {riskStats.critical}
            </span>
            <span className="text-xs text-gray-500">严重</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
              riskStats.warning > 0 ? 'bg-warning-500/20' : 'bg-space-700'
            }`}
          >
            <AlertTriangle
              className={`w-4 h-4 ${
                riskStats.warning > 0 ? 'text-warning-400' : 'text-gray-500'
              }`}
            />
            <span
              className={`text-sm font-mono font-semibold ${
                riskStats.warning > 0 ? 'text-warning-400' : 'text-gray-500'
              }`}
            >
              {riskStats.warning}
            </span>
            <span className="text-xs text-gray-500">警告</span>
          </div>

          <div className="w-px h-6 bg-space-600" />

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>{products.length} 产品</span>
            </div>
            <div className="flex items-center gap-1">
              <FileWarning className="w-3.5 h-3.5 text-warning-400" />
              <span>期限缺失 {riskStats.byType.maturity_missing}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-risk-400" />
              <span>风险错层 {riskStats.byType.risk_misalignment}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-warning-400" />
              <span>收益夸大 {riskStats.byType.yield_exaggeration}</span>
            </div>
          </div>
        </div>

        <div className="w-px h-6 bg-space-600" />

        <button
          onClick={toggleColorMode}
          className="flex items-center gap-2 px-3 py-1.5 bg-space-700 hover:bg-space-600 rounded-lg transition-colors"
        >
          <Palette className="w-4 h-4 text-cyber-400" />
          <span className="text-xs text-gray-300">
            {colorMode === 'risk' ? '按风险着色' : '按类型着色'}
          </span>
        </button>

        <button
          onClick={() => saveToHistory(`快照 - ${new Date().toLocaleString('zh-CN')}`)}
          className="px-3 py-1.5 bg-trust-500/20 hover:bg-trust-500/30 text-trust-400 rounded-lg text-xs font-medium transition-colors"
        >
          保存快照
        </button>
      </div>

      <div className="flex-1 flex items-center gap-4 px-4">
        <button
          onClick={() => setTimeline({ current: timeline.startTime, playing: false })}
          className="p-2 rounded-lg bg-space-700 hover:bg-space-600 transition-colors text-gray-400 hover:text-white"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => setTimeline({ playing: !timeline.playing })}
          className={`p-2.5 rounded-lg transition-colors ${
            timeline.playing
              ? 'bg-risk-500 text-white hover:bg-risk-400'
              : 'bg-cyber-500 text-space-900 hover:bg-cyber-400'
          }`}
        >
          {timeline.playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setTimeline({ current: timeline.endTime, playing: false })}
          className="p-2 rounded-lg bg-space-700 hover:bg-space-600 transition-colors text-gray-400 hover:text-white"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">速度</span>
          <select
            value={timeline.speed}
            onChange={(e) => setTimeline({ speed: parseFloat(e.target.value) })}
            className="bg-space-700 border border-space-600 rounded px-2 py-1 text-xs text-gray-300 focus:border-cyber-500 focus:outline-none"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
          </select>
        </div>

        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs text-gray-500 w-16 text-right">
            {formatDate(timeline.startTime)}
          </span>
          <div className="flex-1 relative">
            <input
              type="range"
              min={timeline.startTime}
              max={timeline.endTime}
              value={timeline.current}
              onChange={handleTimelineChange}
              className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyber-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyber-500/50"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2 bg-cyber-500/30 rounded-lg pointer-events-none"
              style={{
                left: 0,
                width: `${((timeline.current - timeline.startTime) / (timeline.endTime - timeline.startTime)) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-500 w-16">
            {formatDate(timeline.endTime)}
          </span>
          <div className="px-3 py-1 bg-cyber-500/20 rounded-lg">
            <span className="text-xs text-cyber-400 font-mono">
              {formatDate(timeline.current)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
