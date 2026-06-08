import { useMemo, useState } from 'react';
import { X, GitCompare, ArrowLeftRight } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';

export default function ScreenshotCompare() {
  const screenshots = useProjectStore((s) => s.screenshots);

  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  const leftShot = useMemo(() => screenshots.find((s) => s.id === leftId), [screenshots, leftId]);
  const rightShot = useMemo(() => screenshots.find((s) => s.id === rightId), [screenshots, rightId]);

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="absolute top-4 right-4 z-20 btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
      >
        <GitCompare size={12} />
        截图对比 ({screenshots.length})
      </button>
    );
  }

  if (screenshots.length < 2) {
    return (
      <div className="absolute top-4 right-4 z-20 panel-card p-3 w-[280px]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-engineering text-xs text-sea-mist font-semibold flex items-center gap-1.5">
            <GitCompare size={12} className="text-wake-teal" />
            截图对比
          </span>
          <button onClick={() => setShowPanel(false)} className="text-sea-mist/40 hover:text-sea-mist">
            <X size={14} />
          </button>
        </div>
        <div className="text-[11px] text-sea-mist/50 text-center py-4">
          需要至少 2 张截图才能对比
          <br />
          当前已有 {screenshots.length} 张
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-20 panel-card p-3 w-[500px]">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-engineering text-xs text-sea-mist font-semibold flex items-center gap-1.5">
          <GitCompare size={12} className="text-wake-teal" />
          前后截图对比
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const tmp = leftId;
              setLeftId(rightId);
              setRightId(tmp);
            }}
            className="text-sea-mist/60 hover:text-wake-teal"
            title="交换"
          >
            <ArrowLeftRight size={13} />
          </button>
          <button onClick={() => setShowPanel(false)} className="text-sea-mist/40 hover:text-sea-mist">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <select
          value={leftId || ''}
          onChange={(e) => setLeftId(e.target.value || null)}
          className="bg-ocean-slate/60 border border-wake-teal/20 rounded px-2 py-1 text-[11px] text-sea-mist focus:outline-none focus:border-wake-teal"
        >
          <option value="">选择修改前截图</option>
          {screenshots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={rightId || ''}
          onChange={(e) => setRightId(e.target.value || null)}
          className="bg-ocean-slate/60 border border-wake-teal/20 rounded px-2 py-1 text-[11px] text-sea-mist focus:outline-none focus:border-wake-teal"
        >
          <option value="">选择修改后截图</option>
          {screenshots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { shot: leftShot, label: '修改前' },
          { shot: rightShot, label: '修改后' },
        ].map(({ shot, label }) => (
          <div key={label} className="rounded overflow-hidden border border-wake-teal/15">
            <div className="bg-ocean-slate/60 px-2 py-1 flex items-center justify-between">
              <span className="font-engineering text-[10px] text-sea-mist/70">{label}</span>
              {shot?.isOutOfBounds && (
                <span className="text-[9px] text-alert-orange font-semibold">⚠ 越界</span>
              )}
            </div>
            {shot ? (
              <div>
                <img src={shot.dataUrl} alt={shot.name} className="w-full h-28 object-cover" />
                <div className="px-2 py-1.5 bg-ocean-slate/40 space-y-0.5">
                  <div className="font-engineering text-[10px] text-sea-mist/90">{shot.name}</div>
                  <div className="text-[9px] text-sea-mist/50">
                    风速: {shot.parameterSnapshot.windSpeed}{shot.parameterSnapshot.windSpeedUnit} | 风向: {shot.parameterSnapshot.windDirection}°
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-28 flex items-center justify-center text-[10px] text-sea-mist/30">
                请选择截图
              </div>
            )}
          </div>
        ))}
      </div>

      {leftShot && rightShot && (
        <div className="mt-2.5 p-2 rounded bg-alert-orange/10 border border-alert-orange/25">
          <div className="text-[10px] text-alert-orange font-semibold mb-0.5">参数差异</div>
          <div className="text-[10px] text-sea-mist/70 space-y-0.5">
            {Object.entries(leftShot.parameterSnapshot).map(([key, leftVal]) => {
              const rightVal = (rightShot.parameterSnapshot as any)[key];
              if (String(leftVal) !== String(rightVal)) {
                return (
                  <div key={key} className="flex gap-2">
                    <span className="text-sea-mist/50 w-16">{key}:</span>
                    <span className="text-warning-amber">{String(leftVal)}</span>
                    <span className="text-sea-mist/40">→</span>
                    <span className="text-wake-teal">{String(rightVal)}</span>
                  </div>
                );
              }
              return null;
            })}
            {JSON.stringify(leftShot.parameterSnapshot) === JSON.stringify(rightShot.parameterSnapshot) && (
              <div className="text-sea-mist/50">参数未变化</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
