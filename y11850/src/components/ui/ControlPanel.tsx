import { useRef, useEffect } from 'react';
import { Sun, CloudRain, Snowflake, Leaf, Play, Pause, Eye, EyeOff, Save, FileText, Layers, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Season } from '@/types';
import { getSeasonName, formatTime } from '@/utils/sunCalculator';
import { getMockDataPackage } from '@/data/mockData';

const seasonIcons: Record<Season, React.ReactNode> = {
  spring: <Leaf className="w-4 h-4" />,
  summer: <Sun className="w-4 h-4" />,
  autumn: <CloudRain className="w-4 h-4" />,
  winter: <Snowflake className="w-4 h-4" />,
};

const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function ControlPanel() {
  const {
    currentSeason,
    currentTime,
    isPlaying,
    showSunPath,
    showShadows,
    showSetbackLines,
    dataPackage,
    setSeason,
    setTime,
    togglePlaying,
    toggleSunPath,
    toggleShadows,
    toggleSetbackLines,
    setDataPackage,
    loadMockData,
  } = useAppStore();

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setTime((prev) => (prev >= 18 ? 6 : prev + 0.5));
      }, 200);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, setTime]);

  const handleDataSwitch = (type: 'correct' | 'timezoneError' | 'floorError') => {
    const pkg = getMockDataPackage(type);
    setDataPackage(pkg);
  };

  return (
    <div className="w-72 bg-deep-ocean border-r border-white/10 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-display text-sun-orange tracking-wider">
          城市天际线日照盒
        </h2>
        <p className="text-xs text-slate-400 mt-1">交互式日照分析工具</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        <div className="glass-panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Sun className="w-4 h-4 text-sun-orange" />
            季节选择
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {seasons.map((season) => (
              <button
                key={season}
                onClick={() => setSeason(season)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  currentSeason === season
                    ? 'bg-sun-orange text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {seasonIcons[season]}
                {getSeasonName(season)}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-dawn-gold" />
            时间控制
          </h3>
          <div className="text-center mb-3">
            <span className="text-3xl font-display text-sun-orange">
              {formatTime(currentTime)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlaying}
              className={`p-2 rounded-lg transition-all ${
                isPlaying
                  ? 'bg-coral-red text-white'
                  : 'bg-sun-orange text-white hover:bg-orange-600'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="6"
              max="18"
              step="0.5"
              value={currentTime}
              onChange={(e) => setTime(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sun-orange"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-steel-blue" />
            显示选项
          </h3>
          <div className="space-y-2">
            <button
              onClick={toggleSunPath}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                showSunPath ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                {showSunPath ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                太阳轨迹
              </span>
              <div className={`w-3 h-3 rounded-full ${showSunPath ? 'bg-sun-orange' : 'bg-slate-600'}`} />
            </button>
            <button
              onClick={toggleShadows}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                showShadows ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                {showShadows ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                实时阴影
              </span>
              <div className={`w-3 h-3 rounded-full ${showShadows ? 'bg-sun-orange' : 'bg-slate-600'}`} />
            </button>
            <button
              onClick={toggleSetbackLines}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                showSetbackLines ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                {showSetbackLines ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                退界线
              </span>
              <div className={`w-3 h-3 rounded-full ${showSetbackLines ? 'bg-sun-orange' : 'bg-slate-600'}`} />
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-mint-green" />
            测试数据
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => handleDataSwitch('correct')}
              className="w-full px-3 py-2 bg-mint-green/20 hover:bg-mint-green/30 text-mint-green rounded-md text-sm font-medium transition-colors text-left"
            >
              ✅ 正常数据
            </button>
            <button
              onClick={() => handleDataSwitch('timezoneError')}
              className="w-full px-3 py-2 bg-coral-red/20 hover:bg-coral-red/30 text-coral-red rounded-md text-sm font-medium transition-colors text-left"
            >
              ⚠️ 时区错误（UTC）
            </button>
            <button
              onClick={() => handleDataSwitch('floorError')}
              className="w-full px-3 py-2 bg-dawn-gold/20 hover:bg-dawn-gold/30 text-dawn-gold rounded-md text-sm font-medium transition-colors text-left"
            >
              🧐 楼层数据异常
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Save className="w-4 h-4 text-steel-blue" />
            快捷键
          </h3>
          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>保存当前视角</span>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Ctrl + S</kbd>
            </div>
            <div className="flex justify-between">
              <span>左键拖拽</span>
              <span>旋转视角</span>
            </div>
            <div className="flex justify-between">
              <span>滚轮</span>
              <span>缩放</span>
            </div>
            <div className="flex justify-between">
              <span>右键拖拽</span>
              <span>平移</span>
            </div>
          </div>
        </div>
      </div>

      {dataPackage && (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => window.open('/report', '_blank')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-sun-orange to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-orange-500/20"
          >
            <FileText className="w-5 h-5" />
            生成分析报告
          </button>
          <div className="mt-3 text-xs text-center text-slate-500">
            <MapPin className="w-3 h-3 inline mr-1" />
            {dataPackage.name}
          </div>
        </div>
      )}
    </div>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
