import { useState, useMemo } from "react";
import { useStore } from "../store/useStore";
import {
  generateDepreciationSchedule,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "../utils/depreciation";
import {
  generateCSV,
  downloadCSV,
  generateReportContent,
  downloadReport,
  type ReportData,
} from "../utils/export";
import { Download, FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Report() {
  const {
    equipments,
    depreciationLogs,
    maintenances,
    contracts,
    repurchases,
    auditLogs,
    exportRecords,
    addExportRecord,
  } = useStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<"csv" | "txt">("csv");
  const [generating, setGenerating] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === equipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(equipments.map((e) => e.id));
    }
  };

  const handleExport = () => {
    if (selectedIds.length === 0) {
      alert("请选择要导出的设备");
      return;
    }
    setGenerating(true);

    setTimeout(() => {
      const selectedEquipments = equipments.filter((e) =>
        selectedIds.includes(e.id)
      );

      if (format === "csv") {
        const csv = generateCSV(
          selectedEquipments,
          depreciationLogs,
          maintenances,
          contracts,
          repurchases
        );
        const filename = `残值评估报告_${new Date().toISOString().split("T")[0]}.csv`;
        downloadCSV(filename, csv);
        addExportRecord({
          equipmentIds: selectedIds,
          format: "excel",
          operator: "当前用户",
          filename,
        });
      } else {
        const reportData: ReportData[] = selectedEquipments.map((eq) => {
          const logs =
            depreciationLogs.filter((l) => l.equipmentId === eq.id).length > 0
              ? depreciationLogs.filter((l) => l.equipmentId === eq.id)
              : generateDepreciationSchedule(
                  eq,
                  maintenances.filter((m) => m.equipmentId === eq.id)
                );
          return {
            equipment: eq,
            depreciationLogs: logs,
            maintenances: maintenances.filter((m) => m.equipmentId === eq.id),
            contracts: contracts.filter((c) => c.equipmentId === eq.id),
            repurchase: repurchases.find((r) => r.equipmentId === eq.id),
            generatedAt: new Date().toISOString(),
          };
        });
        const content = generateReportContent(reportData);
        const filename = `残值评估报告_${new Date().toISOString().split("T")[0]}.txt`;
        downloadReport(filename, content);
        addExportRecord({
          equipmentIds: selectedIds,
          format: "pdf",
          operator: "当前用户",
          filename,
        });
      }
      setGenerating(false);
    }, 500);
  };

  const recentAudits = useMemo(
    () => auditLogs.slice(0, 10),
    [auditLogs]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">报告导出</h1>
          <p className="text-sm text-navy-500 mt-1">残值评估报告生成 · 导出历史 · 操作追溯</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-navy-900">选择设备</h2>
              <button
                onClick={selectAll}
                className="text-xs text-amber-500 hover:text-amber-600"
              >
                {selectedIds.length === equipments.length ? "取消全选" : "全选"}
              </button>
            </div>
            <div className="space-y-2">
              {equipments.map((eq) => {
                const eqLogs = depreciationLogs.filter((l) => l.equipmentId === eq.id);
                const eqMaint = maintenances.filter((m) => m.equipmentId === eq.id);
                const eqRep = repurchases.find((r) => r.equipmentId === eq.id);
                const bookValue =
                  eqLogs.length > 0
                    ? eqLogs[eqLogs.length - 1]?.bookValue ?? eq.originalValue
                    : eq.originalValue * (1 - eq.residualRate);
                const hasAbnormal = eqLogs.some((l) => l.isAbnormal);

                return (
                  <label
                    key={eq.id}
                    className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedIds.includes(eq.id)
                        ? "border-amber-400 bg-amber-400/5"
                        : "border-navy-100 hover:border-navy-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(eq.id)}
                      onChange={() => toggleSelect(eq.id)}
                      className="w-4 h-4 rounded border-navy-300 text-amber-500 focus:ring-amber-400"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-navy-400">
                          {eq.equipmentNo}
                        </span>
                        <span className="text-sm font-medium text-navy-900">
                          {eq.name}
                        </span>
                        {hasAbnormal && (
                          <span className="flex items-center gap-0.5 text-xs text-danger-400">
                            <AlertTriangle size={10} />
                            异常
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-navy-400 mt-0.5">
                        原值 {formatCurrency(eq.originalValue)} · 净值{" "}
                        {formatCurrency(bookValue)} · 维修 {eqMaint.length} 次
                        {eqRep && " · 待回购"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h2 className="text-sm font-semibold text-navy-900 mb-4">导出配置</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-navy-500 mb-2">导出格式</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      checked={format === "csv"}
                      onChange={() => setFormat("csv")}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-sm text-navy-700">Excel (CSV)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      checked={format === "txt"}
                      onChange={() => setFormat("txt")}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-sm text-navy-700">报告文本</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-2">已选设备</label>
                <div className="text-sm text-navy-900">
                  {selectedIds.length} / {equipments.length} 台
                </div>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={generating || selectedIds.length === 0}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-navy-900 text-white rounded-xl hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {generating ? (
                <>
                  <Clock size={16} className="animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Download size={16} />
                  生成并导出报告
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h2 className="text-sm font-semibold text-navy-900 mb-4">导出历史</h2>
            {exportRecords.length === 0 ? (
              <div className="text-sm text-navy-400 text-center py-6">暂无导出记录</div>
            ) : (
              <div className="space-y-3">
                {exportRecords.slice(0, 6).map((rec) => (
                  <div key={rec.id} className="p-3 bg-navy-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-navy-500" />
                      <span className="text-xs font-medium text-navy-900 truncate">
                        {rec.filename}
                      </span>
                    </div>
                    <div className="text-xs text-navy-400 mt-1">
                      {rec.equipmentIds.length} 台设备 · {formatDateTime(rec.generatedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h2 className="text-sm font-semibold text-navy-900 mb-4">操作痕迹</h2>
            {recentAudits.length === 0 ? (
              <div className="text-sm text-navy-400 text-center py-6">暂无操作记录</div>
            ) : (
              <div className="space-y-2">
                {recentAudits.map((log) => (
                  <div key={log.id} className="text-xs">
                    <div className="flex items-center gap-1 text-navy-700">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          log.action === "CREATE"
                            ? "bg-emerald-100 text-emerald-700"
                            : log.action === "UPDATE"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-navy-100 text-navy-600"
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-navy-500">{log.field}</span>
                    </div>
                    <div className="text-navy-400 mt-0.5 ml-1">
                      {formatDateTime(log.timestamp)} · {log.operator}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
