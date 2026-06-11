import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useUnitDetection } from '@/hooks/useUnitDetection';
import type { WindProfilePoint } from '@/types';

interface Props {
  points: WindProfilePoint[];
}

export function UnitWarningBanner({ points }: Props) {
  const { unitWarningExpanded, toggleUnitWarning } = useAppStore();
  const detection = useUnitDetection(points);

  if (!detection.hasMixedUnits) return null;

  const unitLabels: Record<string, string> = { m: '米(m)', F: '楼层(F)', '层': '层(中文)' };

  return (
    <div className="border-b border-caution bg-caution-light/60">
      <button
        onClick={toggleUnitWarning}
        className="w-full h-9 flex items-center gap-2 px-4 text-left hover:bg-caution-light transition-colors"
      >
        <AlertTriangle className="w-4 h-4 text-caution-dark flex-shrink-0" />
        <span className="text-xs font-medium text-caution-dark">
          检测到高度单位混写：{Object.entries(detection.unitCounts)
            .filter(([, n]) => n > 0)
            .map(([k, n]) => `${unitLabels[k]}×${n}`)
            .join(' / ')}
        </span>
        <span className="text-[11px] text-caution-dark/70 hidden sm:inline ml-1">
          可能影响剖面连续性判断
        </span>
        <div className="flex-1" />
        {unitWarningExpanded ? <ChevronUp className="w-4 h-4 text-caution-dark" /> : <ChevronDown className="w-4 h-4 text-caution-dark" />}
      </button>
      {unitWarningExpanded && (
        <div className="px-4 pb-3 animate-fadeIn">
          <div className="rounded border border-caution bg-white/80 p-3">
            <div className="text-xs font-semibold text-caution-dark mb-2">下一步处理建议</div>
            <ol className="space-y-1.5">
              {detection.suggestedSteps.map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-ocean-700 leading-relaxed">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-caution text-white text-[10px] flex items-center justify-center font-mono">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 pt-2 border-t border-caution/30 text-[11px] text-ocean-500 font-mono">
              涉及数据点: {detection.mixedPointIds.slice(0, 8).join(', ')}
              {detection.mixedPointIds.length > 8 ? ` …共${detection.mixedPointIds.length}个` : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
