import { Package, FileText, AlertTriangle, ClipboardList } from "lucide-react";
import { useVolumeStore } from "@/store/useVolumeStore";

const CARDS = [
  {
    key: "volume", label: "总体积近似",
    icon: Package, color: "text-mist-500", bg: "bg-mist-50", border: "border-mist-100",
  },
  {
    key: "count", label: "材料条目",
    icon: FileText, color: "text-ink-500", bg: "bg-ink-50", border: "border-ink-100",
  },
  {
    key: "anomaly", label: "异常条数",
    icon: AlertTriangle, color: "text-brick-400", bg: "bg-brick-50", border: "border-brick-100",
  },
  {
    key: "gap", label: "草稿缺口",
    icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100",
  },
];

export default function VolumeOverview() {
  const { currentBatch } = useVolumeStore();
  const anomalies = currentBatch.anomalies ?? [];
  const gaps = currentBatch.draftGaps ?? [];

  const values: Record<string, string> = {
    volume: `${(currentBatch.totalApproxVolume ?? 0).toLocaleString()} cm³`,
    count: `${currentBatch.materials.length} 条`,
    anomaly: `${anomalies.length} 条`,
    gap: `${gaps.length} 处`,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className={`${c.bg} border ${c.border} rounded-lg p-4 shadow-card animate-fadeUp hover:shadow-cardHover transition-shadow`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-md bg-white/70 flex items-center justify-center shadow-inset`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
            </div>
            <div className="mono text-2xl font-semibold text-ink-800 mb-1 tracking-tight">
              {values[c.key]}
            </div>
            <div className="serif text-xs text-ink-500">{c.label}</div>
          </div>
        );
      })}
    </div>
  );
}
