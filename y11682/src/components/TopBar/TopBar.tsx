import { Sun } from 'lucide-react';
import { DatePicker } from '../TimeControl/DatePicker';
import { TimezoneSelector } from '../TimeControl/TimezoneSelector';
import { ScreenshotButton } from '../Export/ScreenshotButton';
import { useSunPositionString } from '../../hooks/useSunPosition';
import { useAppStore } from '../../store/useAppStore';

export function TopBar() {
  const { timeSettings } = useAppStore();
  
  const sunPosition = useSunPositionString(
    timeSettings.date,
    timeSettings.hour,
    timeSettings.minute
  );

  const altitudeDeg = (sunPosition.altitude * 180 / Math.PI).toFixed(1);
  const azimuthDeg = ((sunPosition.azimuth * 180 / Math.PI) + 180).toFixed(1);

  return (
    <div className="absolute top-0 left-0 right-0 h-14 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-4 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Sun size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">城市光照阴影沙盘</h1>
            <p className="text-slate-400 text-xs">建筑方案日照分析系统</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <DatePicker />
        <div className="h-6 w-px bg-slate-700" />
        <TimezoneSelector />
        <div className="h-6 w-px bg-slate-700" />
        
        <div className="text-right">
          <div className="text-xs text-slate-400">太阳位置</div>
          <div className="text-sm text-white font-mono">
            高度 {altitudeDeg}° | 方位 {azimuthDeg}°
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700" />
        <ScreenshotButton />
      </div>
    </div>
  );
}
