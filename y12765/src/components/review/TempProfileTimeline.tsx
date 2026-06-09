import { Thermometer, GitCompare, Clock, Tag } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';

export default function TempProfileTimeline() {
  const { temperatureProfiles, selectedProfileId, selectProfile } = useVerificationStore();

  return (
    <div className="card p-4">
      <div className="section-title">
        <Thermometer size={18} className="text-brand-700" />
        温度曲线版本
        <span className="ml-auto text-xs text-slate-500 font-sans font-normal">不用翻聊天记录，版本号在这里</span>
      </div>
      <div className="relative pl-5">
        <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-300 via-brand-200 to-slate-200" />
        <div className="space-y-3">
          {temperatureProfiles.map((p, idx) => {
            const active = p.id === selectedProfileId;
            return (
              <div key={p.id} className="relative">
                <div
                  className={
                    'absolute -left-[18px] top-2 w-3 h-3 rounded-full border-2 border-white ' +
                    (active ? 'bg-brand-600 ring-4 ring-brand-100' : 'bg-slate-300')
                  }
                />
                <div
                  className={
                    'card-hover p-3 cursor-pointer border ' +
                    (active ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200')
                  }
                  onClick={() => selectProfile(p.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="chip bg-brand-700 text-white">
                      <Tag size={11} />{p.version}
                    </span>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                    {idx === 0 && <span className="chip bg-slate-100 text-slate-600">基线</span>}
                    {idx === temperatureProfiles.length - 1 && (
                      <span className="chip bg-warn-500 text-white">最新</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{p.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock size={12} />{p.createdAt}
                    </span>
                    <span className="inline-flex items-center gap-1 text-brand-700">
                      <GitCompare size={12} />
                      {active ? '当前选中' : '点击选用此版本'}
                    </span>
                  </div>
                  <div className="mt-2 h-16 bg-slate-50 rounded border border-slate-200 relative overflow-hidden">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                      <polyline
                        fill="none"
                        stroke={active ? '#0F766E' : '#94A3B8'}
                        strokeWidth="1.5"
                        points={p.points
                          .map((pt) => {
                            const x = (pt.time / Math.max(...p.points.map((x) => x.time))) * 100;
                            const y = 40 - (pt.temperature / 140) * 40;
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          })
                          .join(' ')}
                      />
                    </svg>
                    <div className="absolute bottom-0.5 left-1 text-[10px] text-slate-400">{p.curveData}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
