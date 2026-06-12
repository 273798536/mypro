import { useState, useMemo } from "react";
import { useBuoyStore } from "@/store/useBuoyStore";
import TrendChart from "@/components/TrendChart";
import { BuoyField, FIELD_LABELS } from "@/types";
import { DEFAULT_THRESHOLDS } from "@/utils/formulaEngine";
import { Calendar, MapPin, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD_OPTIONS: { value: BuoyField; label: string; threshold?: number }[] = [
  { value: "plasticConcentration", label: "塑料浓度", threshold: DEFAULT_THRESHOLDS.plasticConcentration },
  { value: "turbidity", label: "浊度", threshold: DEFAULT_THRESHOLDS.turbidity },
  { value: "salinity", label: "盐度" },
  { value: "temperature", label: "水温", threshold: DEFAULT_THRESHOLDS.temperatureMax },
];

export default function HistoryView() {
  const records = useBuoyStore((s) => s.records);
  const [selectedField, setSelectedField] = useState<BuoyField>("plasticConcentration");
  const [selectedLocation, setSelectedLocation] = useState<string>("全部");
  const [locDropdownOpen, setLocDropdownOpen] = useState(false);

  const locations = useMemo(() => {
    const set = new Set(records.map((r) => r.location));
    return ["全部", ...Array.from(set)];
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = records.filter(
      (r) => r.quality !== "recollect" && r[selectedField] !== null
    );
    if (selectedLocation !== "全部") {
      result = result.filter((r) => r.location === selectedLocation);
    }
    return result.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [records, selectedField, selectedLocation]);

  const stats = useMemo(() => {
    const values = filteredRecords
      .map((r) => r[selectedField] as number)
      .filter((v) => v !== null);
    if (values.length === 0) return { avg: 0, max: 0, min: 0, count: 0 };
    return {
      avg: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)),
      max: Math.max(...values),
      min: Math.min(...values),
      count: values.length,
    };
  }, [filteredRecords, selectedField]);

  const threshold = FIELD_OPTIONS.find((f) => f.value === selectedField)?.threshold;

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h3 className="font-serif text-xl font-semibold text-ocean-50 mb-1">
              历史数据回看
            </h3>
            <p className="text-sm text-ocean-400/80">
              时间轴趋势查询，异常点已用红色圆圈标注，可悬浮查看详情。
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setLocDropdownOpen(!locDropdownOpen)}
                className="btn-secondary flex items-center gap-2 min-w-[200px] justify-between"
              >
                <MapPin size={14} />
                <span className="text-sm">{selectedLocation}</span>
                <ChevronDown size={14} />
              </button>
              {locDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-full rounded-lg bg-ocean-900/95 backdrop-blur-xl border border-ocean-600/30 shadow-2xl z-50 max-h-60 overflow-y-auto scrollbar-thin">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setLocDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm border-b border-ocean-700/30 hover:bg-ocean-700/40 transition-colors text-ocean-200",
                        loc === selectedLocation && "bg-ocean-600/30 text-ocean-50"
                      )}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-ocean-800/50 rounded-lg p-1 border border-ocean-600/20">
              {FIELD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedField(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    selectedField === opt.value
                      ? "bg-ocean-500 text-white shadow-md shadow-ocean-500/30"
                      : "text-ocean-300 hover:text-ocean-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-ocean-400/70 mb-1 flex items-center gap-1">
            <Calendar size={12} />
            数据点
          </p>
          <p className="font-mono text-2xl font-bold text-ocean-50 font-serif">
            {stats.count}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-ocean-400/70 mb-1">平均值</p>
          <p className="font-mono text-2xl font-bold text-ocean-400 font-serif">
            {stats.avg}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-ocean-400/70 mb-1">最大值</p>
          <p className="font-mono text-2xl font-bold text-quality-recollect font-serif">
            {stats.max}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-ocean-400/70 mb-1">最小值</p>
          <p className="font-mono text-2xl font-bold text-quality-available font-serif">
            {stats.min}
          </p>
        </div>
      </div>

      <TrendChart records={filteredRecords} field={selectedField} threshold={threshold} />

      <div className="glass-card p-5">
        <h4 className="font-serif text-base font-semibold text-ocean-50 mb-3">
          结果说明（{FIELD_LABELS[selectedField]}）
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-lg bg-quality-available/10 border border-quality-available/20">
            <p className="text-xs font-semibold text-quality-available mb-1.5 uppercase tracking-wider">
              可用数据
            </p>
            <p className="text-sm text-ocean-200/90">
              共 {stats.count} 条有效数据点，质量等级为「可用」且审核通过，可直接用于趋势分析。
            </p>
          </div>
          <div className="p-4 rounded-lg bg-quality-pending/10 border border-quality-pending/20">
            <p className="text-xs font-semibold text-quality-pending mb-1.5 uppercase tracking-wider">
              暂缓数据
            </p>
            <p className="text-sm text-ocean-200/90">
              已排除重采建议记录。图中缺失日期代表该时段对应字段为空或数据未通过审核。
            </p>
          </div>
          <div className="p-4 rounded-lg bg-quality-recollect/10 border border-quality-recollect/20">
            <p className="text-xs font-semibold text-quality-recollect mb-1.5 uppercase tracking-wider">
              需重新采集
            </p>
            <p className="text-sm text-ocean-200/90">
              若红圈标注的异常点集中出现，请联系科研助理核对原始浮标日志，必要时安排重新采样。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
