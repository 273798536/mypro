import { useVolumeStore } from "@/store/useVolumeStore";

const TYPE_LABELS: Record<string, string> = {
  large_error: "误差过大",
  bad_data: "坏数据",
  zero_division: "除零边界",
  empty_set: "空集合",
  draft_gap: "草稿缺失",
};

const TYPE_COLORS: Record<string, string> = {
  large_error: "#C14B3C",
  bad_data: "#A03B2E",
  zero_division: "#D4A24C",
  empty_set: "#4A8B8B",
  draft_gap: "#CFB264",
};

export default function AnomalyBarChart() {
  const { currentBatch } = useVolumeStore();
  const anomalies = currentBatch.anomalies ?? [];

  const counts: Record<string, number> = {};
  anomalies.forEach((a) => {
    counts[a.type] = (counts[a.type] ?? 0) + 1;
  });

  const entries = Object.entries(counts);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const total = anomalies.length;

  return (
    <div className="bg-white/80 backdrop-blur rounded-lg border border-ink-100 shadow-card p-5 animate-fadeUp" style={{ animationDelay: "180ms" }}>
      <h3 className="serif text-base font-semibold text-ink-800 mb-4">异常类型分布</h3>
      {entries.length === 0 ? (
        <p className="serif text-sm text-mist-500">本批次暂无异常记录</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([type, count], i) => (
            <div key={type} className="group cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="serif text-xs text-ink-600">{TYPE_LABELS[type] ?? type}</span>
                <span className="mono text-xs text-ink-500">
                  {count} 条 · {((count / total) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-6 bg-ink-50 rounded overflow-hidden relative">
                <div
                  className="h-full rounded transition-all group-hover:opacity-80 animate-fadeUp"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: TYPE_COLORS[type] ?? "#6386AD",
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
