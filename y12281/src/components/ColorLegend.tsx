import useAppStore from '@/store/useAppStore';
import { HEATMAP_COLORS, getLossRatioLabel } from '@/utils/colorMapping';

export default function ColorLegend() {
  const parameters = useAppStore((state) => state.parameters);
  const labels = getLossRatioLabel(parameters.lossRatioThresholds);
  const colors = [
    HEATMAP_COLORS.low,
    HEATMAP_COLORS.mediumLow,
    HEATMAP_COLORS.medium,
    HEATMAP_COLORS.mediumHigh,
    HEATMAP_COLORS.high,
  ];

  return (
    <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">赔付率热力图例</h3>
      <div className="space-y-2">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded shadow-lg"
              style={{ backgroundColor: colors[i] }}
            />
            <span className="text-xs text-slate-300 font-mono">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <h4 className="text-xs font-medium text-slate-400 mb-2">维度说明</h4>
        <div className="space-y-1 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-3 bg-blue-500/50 rounded-sm" />
            <span>高度 = 保费规模</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-3 bg-green-500/50 rounded-sm" />
            <span>深度 = 灾害暴露</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-3 bg-yellow-500/50 rounded-sm" />
            <span>颜色 = 赔付率</span>
          </div>
        </div>
      </div>
    </div>
  );
}
