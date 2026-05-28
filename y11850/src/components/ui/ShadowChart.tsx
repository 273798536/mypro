import { useMemo } from 'react';
import { useAppStore, useCurrentBuilding, useBuildingAnalysis } from '@/store/useAppStore';
import { formatTime } from '@/utils/shadowDetector';

export function ShadowChart() {
  const { currentTime, currentSeason } = useAppStore();
  const currentBuilding = useCurrentBuilding();
  const buildingAnalysis = currentBuilding 
    ? useBuildingAnalysis(currentBuilding.id) 
    : [];

  const hourlyData = useMemo(() => {
    const data: { hour: number; sunlight: number; shadow: number }[] = [];
    
    for (let hour = 6; hour <= 18; hour += 1) {
      let sunlightCount = 0;
      let totalCount = 0;
      
      for (const analysis of buildingAnalysis) {
        totalCount++;
        let isSunny = false;
        
        for (const period of analysis.shadowPeriods) {
          if (hour >= period.start && hour < period.end) {
            isSunny = true;
            break;
          }
        }
        
        if (!isSunny && analysis.totalSunlightHours > 0) {
          sunlightCount++;
        }
      }
      
      data.push({
        hour,
        sunlight: totalCount > 0 ? (sunlightCount / totalCount) * 100 : 0,
        shadow: totalCount > 0 ? ((totalCount - sunlightCount) / totalCount) * 100 : 0,
      });
    }
    
    return data;
  }, [buildingAnalysis]);

  if (!currentBuilding) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <div className="text-4xl mb-2">🏙️</div>
        <p className="text-sm">点击左侧建筑查看日照分析</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-200">
          {currentBuilding.name} · 日照比例
        </h4>
        <span className="text-xs text-slate-400">
          {currentSeason === 'spring' ? '春分' : currentSeason === 'summer' ? '夏至' : currentSeason === 'autumn' ? '秋分' : '冬至'}
        </span>
      </div>
      
      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-end gap-1 h-32">
          {hourlyData.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col justify-end relative group">
              <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-ocean-light px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
              >
                {formatTime(item.hour)}: {item.sunlight.toFixed(0)}% 有日照
              </div>
              
              <div 
                className="w-full bg-mint-green/30" 
                style={{ height: `${item.sunlight}%` }}
              />
              <div 
                className="w-full bg-slate-600/50" 
                style={{ height: `${item.shadow}%` }}
              />
              
              {Math.abs(item.hour - currentTime) < 0.5 && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sun-orange rounded-full animate-pulse" />
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          <span>06</span>
          <span>09</span>
          <span>12</span>
          <span>15</span>
          <span>18</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-mint-green/50 rounded-sm" />
          <span className="text-xs text-slate-400">有日照</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-slate-600/50 rounded-sm" />
          <span className="text-xs text-slate-400">被遮挡</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-sun-orange rounded-full" />
          <span className="text-xs text-slate-400">当前时间</span>
        </div>
      </div>
    </div>
  );
}
