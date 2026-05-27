import { useState, useMemo } from "react";
import { useStore } from "../store/useStore";
import {
  generateDepreciationSchedule,
  formatCurrency,
  formatDate,
} from "../utils/depreciation";
import { downloadCSV, exportDepreciationDetail } from "../utils/export";
import type { DepreciationMethod } from "../types";
import DepreciationChart from "../components/DepreciationChart";
import { Calculator, AlertTriangle, Download, Save, RotateCcw } from "lucide-react";

export default function Depreciation() {
  const {
    equipments,
    maintenances,
    setDepreciationLogs,
    addAuditLog,
  } = useStore();

  const [selectedEquipmentId, setSelectedEquipmentId] = useState(
    equipments[0]?.id ?? ""
  );
  const [monthOverride, setMonthOverride] = useState<Record<string, number>>({});

  const selectedEquipment = useMemo(
    () => equipments.find((e) => e.id === selectedEquipmentId),
    [equipments, selectedEquipmentId]
  );

  const [params, setParams] = useState(() => ({
    originalValue: selectedEquipment?.originalValue ?? 0,
    residualRate: selectedEquipment?.residualRate ?? 0.05,
    depreciationMethod: (selectedEquipment?.depreciationMethod ?? "straight") as DepreciationMethod,
    depreciationMonths: selectedEquipment?.depreciationMonths ?? 120,
    startDate: selectedEquipment?.startDate ?? "",
  }));

  const eqMaintenances = useMemo(
    () => maintenances.filter((m) => m.equipmentId === selectedEquipmentId),
    [maintenances, selectedEquipmentId]
  );

  const schedule = useMemo(() => {
    if (!selectedEquipment) return [];
    const calcEquipment = { ...selectedEquipment, ...params };
    return generateDepreciationSchedule(calcEquipment, eqMaintenances);
  }, [selectedEquipment, params, eqMaintenances]);

  const abnormalLogs = schedule.filter((l) => l.isAbnormal);
  const latestLog = schedule[schedule.length - 1];

  const handleSave = () => {
    if (!selectedEquipment) return;
    setDepreciationLogs(selectedEquipment.id, schedule);
    addAuditLog({
      equipmentId: selectedEquipment.id,
      action: "UPDATE",
      field: "depreciationSchedule",
      oldValue: "",
      newValue: `重新计算折旧计划，共${schedule.length}个月，异常项${abnormalLogs.length}个`,
      source: "折旧试算",
      operator: "当前用户",
    });
    alert("折旧计划已保存");
  };

  const handleExport = () => {
    if (!selectedEquipment) return;
    const csv = exportDepreciationDetail(selectedEquipment, schedule, eqMaintenances);
    downloadCSV(`折旧明细_${selectedEquipment.equipmentNo}.csv`, csv);
  };

  const handleReset = () => {
    if (!selectedEquipment) return;
    setParams({
      originalValue: selectedEquipment.originalValue,
      residualRate: selectedEquipment.residualRate,
      depreciationMethod: selectedEquipment.depreciationMethod,
      depreciationMonths: selectedEquipment.depreciationMonths,
      startDate: selectedEquipment.startDate,
    });
    setMonthOverride({});
  };

  if (!selectedEquipment) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">折旧试算</h1>
          <p className="text-sm text-navy-500 mt-1">参数调整即时计算 · 异常项高亮标注 · 来源追溯</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h2 className="text-sm font-semibold text-navy-900 mb-4">选择设备</h2>
            <select
              value={selectedEquipmentId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedEquipmentId(id);
                const eq = equipments.find((x) => x.id === id);
                if (eq) {
                  setParams({
                    originalValue: eq.originalValue,
                    residualRate: eq.residualRate,
                    depreciationMethod: eq.depreciationMethod,
                    depreciationMonths: eq.depreciationMonths,
                    startDate: eq.startDate,
                  });
                }
              }}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              {equipments.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.equipmentNo} - {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-navy-900">折旧参数</h2>
              <button
                onClick={handleReset}
                className="text-xs text-navy-400 hover:text-navy-600 flex items-center gap-1"
              >
                <RotateCcw size={12} />
                重置
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-navy-500 mb-1">设备原值（元）</label>
                <input
                  type="number"
                  value={params.originalValue}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, originalValue: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">残值率（%）</label>
                <input
                  type="number"
                  step="0.1"
                  value={params.residualRate * 100}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, residualRate: Number(e.target.value) / 100 }))
                  }
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">折旧方法</label>
                <select
                  value={params.depreciationMethod}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      depreciationMethod: e.target.value as DepreciationMethod,
                    }))
                  }
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                >
                  <option value="straight">直线法</option>
                  <option value="doubleDeclining">双倍余额递减法</option>
                  <option value="sumOfYears">年数总和法</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">折旧月份</label>
                <input
                  type="number"
                  value={params.depreciationMonths}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      depreciationMonths: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">起始日期</label>
                <input
                  type="date"
                  value={params.startDate}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, startDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h2 className="text-sm font-semibold text-navy-900 mb-4">计算结果</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-navy-400">预计残值</span>
                <span className="font-mono text-navy-900">
                  {formatCurrency(params.originalValue * params.residualRate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">期末账面净值</span>
                <span
                  className={`font-mono font-bold ${
                    latestLog?.isAbnormal ? "text-danger-400" : "text-amber-500"
                  }`}
                >
                  {latestLog ? formatCurrency(latestLog.bookValue) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">累计折旧</span>
                <span className="font-mono text-navy-900">
                  {latestLog ? formatCurrency(latestLog.accumulatedDepreciation) : "-"}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-navy-100">
                <span className="text-navy-400">异常月份</span>
                <span
                  className={`font-mono ${
                    abnormalLogs.length > 0 ? "text-danger-400 font-medium" : "text-emerald-600"
                  }`}
                >
                  {abnormalLogs.length > 0 ? `${abnormalLogs.length}个月` : "无异常"}
                </span>
              </div>
            </div>
          </div>

          {eqMaintenances.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-400/30 bg-amber-400/5 p-5">
              <h2 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} />
                维修影响
              </h2>
              <div className="space-y-2">
                {eqMaintenances
                  .filter((m) => m.valueAdjustment !== 0)
                  .map((m) => (
                    <div key={m.id} className="text-xs p-2 bg-white rounded-lg">
                      <div className="text-navy-900">{m.description}</div>
                      <div className="text-navy-400 mt-0.5">
                        {formatDate(m.maintenanceDate)} · 调整 {formatCurrency(m.valueAdjustment)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 text-white rounded-lg hover:bg-amber-500 transition-colors text-sm"
            >
              <Save size={14} />
              保存计算结果
            </button>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-navy-200 rounded-lg text-navy-600 hover:bg-navy-50 transition-colors text-sm"
            >
              <Download size={14} />
              导出
            </button>
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-navy-900">折旧曲线</h2>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-amber-400 rounded" />
                  <span className="text-navy-500">账面净值</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-danger-400" />
                  <span className="text-navy-500">维修调整</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-danger-400" />
                  <span className="text-navy-500">异常点</span>
                </div>
              </div>
            </div>
            <DepreciationChart
              equipment={{ ...selectedEquipment, ...params }}
              logs={schedule}
              maintenances={eqMaintenances}
              height={220}
            />
          </div>

          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-navy-900">月度折旧明细</h2>
              <div className="text-xs text-navy-400">
                共 {schedule.length} 个月
                {abnormalLogs.length > 0 && (
                  <span className="text-danger-400 ml-2">
                    ⚠ {abnormalLogs.length} 项异常
                  </span>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-auto border border-navy-100 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-navy-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-navy-600">月份</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-navy-600">月折旧</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-navy-600">累计折旧</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-navy-600">账面净值</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-navy-600">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((log) => (
                    <tr
                      key={log.id}
                      className={`border-t border-navy-100 ${
                        log.isAbnormal ? "bg-danger-400/5" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-navy-600 font-mono">第{log.month}月</td>
                      <td className="px-3 py-2 text-right font-mono text-navy-900">
                        {formatCurrency(log.monthlyDepreciation)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-navy-600">
                        {formatCurrency(log.accumulatedDepreciation)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-medium ${
                          log.isAbnormal ? "text-danger-400" : "text-amber-500"
                        }`}
                      >
                        {formatCurrency(log.bookValue)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {log.isAbnormal ? (
                          <span className="text-xs text-danger-400 flex items-center justify-center gap-1">
                            <AlertTriangle size={10} />
                            异常
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {abnormalLogs.length > 0 && (
              <div className="mt-4 p-3 bg-danger-400/10 rounded-lg">
                <div className="text-xs font-medium text-danger-400 mb-2">异常说明</div>
                <div className="space-y-1">
                  {abnormalLogs.map((l) => (
                    <div key={l.id} className="text-xs text-navy-600">
                      第{l.month}月：{l.abnormalReason} — 账面净值 {formatCurrency(l.bookValue)}
                      （来源：折旧计算引擎）
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
