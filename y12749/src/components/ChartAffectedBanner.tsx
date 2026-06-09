import { useBatchStore } from '@/store/useBatchStore';
import { AlertTriangle, Eye, EyeOff, CheckSquare } from 'lucide-react';

export default function ChartAffectedBanner() {
  const { batch, markChartAvailable, markChartMissing } = useBatchStore();
  const { chartsMissing, chartsAvailable, conclusions } = batch;

  if (chartsMissing.length === 0) return null;

  const affectedKeys = Array.from(
    new Set(conclusions.filter((c) => c.affectedByMissingCharts).map((c) => c.title)),
  );

  return (
    <div className="no-print card-base border-l-4 border-amber-400 bg-amber-50/70 p-4 animate-slide-down">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0 animate-pulse-soft" />
        <div className="flex-1">
          <h3 className="font-serif text-sm font-semibold text-amber-800">
            图表截图未到齐，以下结论受影响（旧结果已保留，未被覆盖）
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {chartsMissing.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-white border border-amber-300 text-amber-700"
              >
                <EyeOff size={12} />
                {name}
                <button
                  onClick={() => markChartAvailable(name)}
                  className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
                >
                  <CheckSquare size={11} />
                  标记到齐
                </button>
              </span>
            ))}
            {chartsAvailable.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-teal-50 border border-teal-200 text-teal-700"
              >
                <Eye size={12} />
                {name}
                <button
                  onClick={() => markChartMissing(name)}
                  className="ml-1 text-teal-500 hover:text-teal-700 transition-colors text-[10px]"
                >
                  撤销
                </button>
              </span>
            ))}
          </div>
          {affectedKeys.length > 0 && (
            <div className="mt-2 text-xs text-amber-700">
              受影响结论：
              <span className="font-medium">{affectedKeys.join('、')}</span>
              <span className="ml-1 text-amber-600">
                （对应卡片已灰显，旧值保留在括号中以便对比）
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
