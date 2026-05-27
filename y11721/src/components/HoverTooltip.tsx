import { useSolarStore } from '../store/solarStore';

export function HoverTooltip() {
  const hoveredInfo = useSolarStore(state => state.hoveredInfo);

  if (!hoveredInfo) return null;

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg px-4 py-3 border border-gray-600 shadow-xl max-w-md">
        <div className="flex items-center gap-3">
          <div className="text-emerald-400 font-semibold text-sm">
            {hoveredInfo.key}
          </div>
          <div className="text-white font-mono">
            {hoveredInfo.value}
          </div>
        </div>
        <div className="text-gray-400 text-xs mt-1">
          {hoveredInfo.description}
        </div>
      </div>
    </div>
  );
}
