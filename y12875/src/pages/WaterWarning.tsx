import { useWarningStore } from "@/store/useWarningStore";
import { useBuoyStore } from "@/store/useBuoyStore";
import WarningCard from "@/components/WarningCard";
import { formatTimestamp } from "@/utils/correctionLogger";
import { ChevronDown, AlertOctagon, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";
import { classifyForDisplay } from "@/utils/qualityDetector";
import { calculateAllWarnings } from "@/utils/formulaEngine";

export default function WaterWarning() {
  const selectedBuoyId = useWarningStore((s) => s.selectedBuoyId);
  const thresholds = useWarningStore((s) => s.thresholds);
  const formulaExpanded = useWarningStore((s) => s.formulaExpanded);
  const setSelectedBuoyId = useWarningStore((s) => s.setSelectedBuoyId);
  const toggleFormula = useWarningStore((s) => s.toggleFormula);
  const records = useBuoyStore((s) => s.records);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const usableRecords = useMemo(
    () =>
      [...records]
        .filter((r) => r.quality !== "recollect")
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [records]
  );

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedBuoyId),
    [records, selectedBuoyId]
  );

  const warnings = useMemo(() => {
    if (!selectedRecord) return [];
    return calculateAllWarnings(selectedRecord, thresholds);
  }, [selectedRecord, thresholds]);

  const triggered = useMemo(
    () => warnings.filter((w) => w.isTriggered),
    [warnings]
  );
  const normal = useMemo(
    () => warnings.filter((w) => !w.isTriggered),
    [warnings]
  );

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-serif text-xl font-semibold text-ocean-50">
                水质预警面板
              </h3>
              {triggered.length > 0 ? (
                <span className="tag bg-quality-recollect/20 text-quality-recollect border border-quality-recollect/30">
                  <AlertOctagon size={12} />
                  {triggered.length} 项指标异常
                </span>
              ) : (
                <span className="tag bg-quality-available/20 text-quality-available border border-quality-available/30">
                  <CheckCircle2 size={12} />
                  全部指标正常
                </span>
              )}
            </div>
            <p className="text-sm text-ocean-400/80 max-w-2xl leading-relaxed">
              基于浮标数据自动计算 5 项水质预警指标。公式、单位、适用范围和失败原因已在每张卡片下方展开说明，供课题组核对使用。
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="btn-secondary flex items-center gap-2 min-w-[280px] justify-between"
            >
              <div className="text-left">
                <div className="text-sm text-ocean-100">
                  {selectedRecord?.buoyId || "选择浮标"}
                </div>
                <div className="text-xs text-ocean-400">
                  {selectedRecord
                    ? `${formatTimestamp(selectedRecord.timestamp)} · ${selectedRecord.location}`
                    : "请选择浮标记录"}
                </div>
              </div>
              <ChevronDown size={16} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-full max-h-80 overflow-y-auto scrollbar-thin rounded-lg bg-ocean-900/95 backdrop-blur-xl border border-ocean-600/30 shadow-2xl z-50">
                {usableRecords.map((r) => {
                  const display = classifyForDisplay(r);
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedBuoyId(r.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left border-b border-ocean-700/30 hover:bg-ocean-700/40 transition-colors ${
                        r.id === selectedBuoyId ? "bg-ocean-600/30" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-ocean-100">
                          {r.buoyId}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            display === "direct_use"
                              ? "bg-quality-available/15 text-quality-available"
                              : "bg-quality-pending/15 text-quality-pending"
                          }`}
                        >
                          {display === "direct_use" ? "直接可用" : "需复核"}
                        </span>
                      </div>
                      <div className="text-xs text-ocean-400/80 mt-0.5">
                        {formatTimestamp(r.timestamp)} · {r.location}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...triggered, ...normal].map((w, i) => (
          <div key={w.id} className="animate-float-in" style={{ animationDelay: `${i * 60}ms` }}>
            <WarningCard
              warning={w}
              expanded={formulaExpanded[w.id] || false}
              onToggle={() => toggleFormula(w.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
