import { Filter, GitBranch } from "lucide-react";
import { useStore, cabinets, thresholdVersions } from "@/store/useStore";
import { AnomalyType, ANOMALY_LABELS } from "@/types";

const ANOMALY_COLORS: Record<AnomalyType, string> = {
  normal: "#10b981",
  drift: "#f59e0b",
  threshold_version_error: "#ef4444",
  missing_sample: "#8b5cf6",
};

const ANOMALY_TYPES: AnomalyType[] = [
  "normal",
  "drift",
  "threshold_version_error",
  "missing_sample",
];

export default function FilterBar() {
  const { filters, setFilters, thresholdVersionId, setThresholdVersionId } =
    useStore();

  return (
    <div className="flex items-center gap-4 bg-[#0d1117] border border-gray-700 rounded-lg px-4 py-3">
      <Filter className="w-4 h-4 text-gray-400 shrink-0" />

      <select
        value={filters.cabinetId ?? ""}
        onChange={(e) =>
          setFilters({
            ...filters,
            cabinetId: e.target.value || undefined,
          })
        }
        className="bg-[#161b22] border border-gray-700 text-gray-300 text-sm rounded-md px-3 py-1.5 outline-none focus:border-gray-500"
      >
        <option value="">全部柜体</option>
        {cabinets.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        {ANOMALY_TYPES.map((type) => {
          const active = filters.anomalyType === type;
          return (
            <button
              key={type}
              onClick={() =>
                setFilters({
                  ...filters,
                  anomalyType: active ? undefined : type,
                })
              }
              className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border transition-colors ${
                active
                  ? "border-gray-500 bg-[#1c2333] text-gray-100"
                  : "border-gray-700 bg-[#0d1117] text-gray-400 hover:text-gray-300 hover:border-gray-600"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: ANOMALY_COLORS[type] }}
              />
              {ANOMALY_LABELS[type]}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-gray-500 shrink-0" />
        {thresholdVersions.map((v) => {
          const active = thresholdVersionId === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setThresholdVersionId(v.id)}
              className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                active
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-gray-700 bg-[#0d1117] text-gray-400 hover:text-gray-300 hover:border-gray-600"
              }`}
            >
              {v.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
