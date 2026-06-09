import { useAppStore } from '../store';
import { paramRanges, paramLinkageRules } from '../utils/constants';

export default function ParamDashboard() {
  const params = useAppStore((s) => s.params);
  const measurements = useAppStore((s) => s.measurements);

  const isParamLinked = (key: string) =>
    paramLinkageRules.some((r) => r.target === key || r.source === key);

  const getLinkedDescription = (key: string) => {
    const rule = paramLinkageRules.find((r) => r.target === key);
    return rule?.description ?? '';
  };

  const paramKeys: Array<keyof typeof params> = [
    'windSpeed',
    'windDirection',
    'grainSize',
    'moisture',
    'vegetation',
    'erosionRate',
    'threshold',
    'cohesion'
  ];

  return (
    <div className="absolute top-4 right-4 z-10 w-80 card bg-white/95 backdrop-blur-sm max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-sand-800">参数仪表盘</h3>
        <span className="text-xs text-sand-500">实时联动显示</span>
      </div>

      <p className="text-xs text-sand-600 mb-3 leading-relaxed">
        以下参数展示当前风蚀模拟状态。带<span className="text-amber-700 font-medium"> 联动 </span>
        标识的参数会在关联测量数据补录后自动更新，并附有物理含义说明，便于向他人讲解。
      </p>

      <div className="space-y-2.5">
        {paramKeys.map((key) => {
          const meta = paramRanges[key];
          const value = params[key];
          const linked = isParamLinked(key);
          const ratio = meta ? Math.min(1, Math.max(0, (value - meta.min) / (meta.max - meta.min))) : 0;
          const latestMeasurement = [...measurements]
            .reverse()
            .find((m) => m.paramName === key);

          return (
            <div key={key} className="p-2.5 rounded-md bg-sand-50 border border-sand-200">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-sand-800">
                    {meta?.label ?? key}
                  </span>
                  {linked && (
                    <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">
                      联动
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-semibold text-sand-900">
                    {value.toFixed(2)}
                  </span>
                  <span className="text-xs text-sand-500 ml-1">{meta?.unit}</span>
                </div>
              </div>

              <div className="w-full h-1.5 bg-sand-200 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-gradient-to-r from-sand-400 to-amber rounded-full transition-all"
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-sand-500">
                <span>
                  范围 {meta?.min}-{meta?.max} {meta?.unit}
                </span>
                {latestMeasurement && (
                  <span className="text-sand-600">
                    最近补录：{latestMeasurement.value} {latestMeasurement.unit}
                  </span>
                )}
              </div>

              {linked && (
                <div className="mt-1.5 pt-1.5 border-t border-sand-200 text-[11px] text-sand-600 leading-relaxed">
                  {getLinkedDescription(key)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
