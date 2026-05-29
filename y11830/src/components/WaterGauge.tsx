interface WaterGaugeProps {
  upstreamLevel: number;
  reservoirCapacity: number;
  downstreamFlow: number;
  downstreamSafeThreshold: number;
}

export default function WaterGauge({
  upstreamLevel,
  reservoirCapacity,
  downstreamFlow,
  downstreamSafeThreshold,
}: WaterGaugeProps) {
  const upRatio = Math.min(upstreamLevel / reservoirCapacity, 1);
  const downRatio = Math.min(downstreamFlow / (downstreamSafeThreshold * 1.5), 1);
  const downThresholdRatio = downstreamFlow / downstreamSafeThreshold;

  const upColor =
    upRatio > 0.85 ? "bg-red-500" : upRatio > 0.7 ? "bg-amber-500" : "bg-green-500";
  const downColor =
    downThresholdRatio > 0.8
      ? "bg-red-500"
      : downThresholdRatio > 0.6
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className="flex gap-6 items-end">
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-bold text-white">{upstreamLevel.toFixed(1)}m</span>
        <div className="w-10 h-32 bg-gray-800 rounded-full relative overflow-hidden">
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-full ${upColor} transition-all duration-700 ease-in-out`}
            style={{ height: `${upRatio * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">上游水位</span>
        <span className="text-xs text-gray-500">库容 {reservoirCapacity}m</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-bold text-white">{downstreamFlow} m³/s</span>
        <div className="w-10 h-32 bg-gray-800 rounded-full relative overflow-hidden">
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-full ${downColor} transition-all duration-700 ease-in-out`}
            style={{ height: `${downRatio * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">下游流量</span>
        <span className="text-xs text-gray-500">安全线 {downstreamSafeThreshold}</span>
      </div>
    </div>
  );
}
