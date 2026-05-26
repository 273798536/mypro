import { useAppStore } from '../../store/useAppStore';
import { formatDuration } from '../../utils/sunlightStats';

export function SunlightDetail() {
  const { selectedPlaygroundId, playgrounds, sunlightStats } = useAppStore();

  const playground = playgrounds.find(p => p.id === selectedPlaygroundId);
  const stats = sunlightStats.find(s => s.playgroundId === selectedPlaygroundId);

  if (!playground) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-sm">请在左侧选择一个活动场地查看详情</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: playground.color + '15', borderLeft: `3px solid ${playground.color}` }}>
        <h4 className="font-medium text-white mb-1">{playground.name}</h4>
        <p className="text-xs text-slate-400">
          要求日照时长: {formatDuration(playground.requiredSunlight)}
        </p>
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="text-2xl font-bold text-white">
                {formatDuration(stats.totalMinutes)}
              </div>
              <div className="text-xs text-slate-400">实际日照时长</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className={`text-2xl font-bold ${stats.is达标 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.is达标 ? '达标' : '不达标'}
              </div>
              <div className="text-xs text-slate-400">评估结果</div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-2">日照时段分布</h5>
            <div className="flex h-6 rounded overflow-hidden bg-slate-700">
              {stats.timeSlots.map((slot, index) => {
                const width = ((slot.end - slot.start) / 720) * 100;
                return (
                  <div
                    key={index}
                    className="h-full"
                    style={{
                      width: `${width}%`,
                      backgroundColor: slot.sunlight ? '#fbbf24' : '#374151'
                    }}
                    title={`${Math.floor(slot.start / 60).toString().padStart(2, '0')}:${Math.floor(slot.start % 60).toString().padStart(2, '0')} - ${Math.floor(slot.end / 60).toString().padStart(2, '0')}:${Math.floor(slot.end % 60).toString().padStart(2, '0')} ${slot.sunlight ? '有日照' : '无日照'}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
            </div>
          </div>

          {stats.gaps.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h5 className="text-sm font-medium text-amber-400 mb-2">
                数据缺口 ({stats.gaps.length}处)
              </h5>
              <div className="space-y-1">
                {stats.gaps.map((gap, index) => (
                  <div key={index} className="text-xs text-amber-300/80">
                    {Math.floor(gap.start / 60).toString().padStart(2, '0')}:{Math.floor(gap.start % 60).toString().padStart(2, '0')} - 
                    {Math.floor(gap.end / 60).toString().padStart(2, '0')}:{Math.floor(gap.end % 60).toString().padStart(2, '0')}
                    <span className="text-amber-400/60 ml-2">{gap.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4 text-slate-500">
          <div className="animate-pulse">正在计算日照数据...</div>
        </div>
      )}
    </div>
  );
}
