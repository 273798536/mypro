import { useMemo } from "react";
import { useStore } from "../store/useStore";
import EquipmentCard from "../components/EquipmentCard";
import DepreciationChart from "../components/DepreciationChart";
import {
  generateDepreciationSchedule,
  getCurrentBookValue,
  formatCurrency,
  formatDate,
} from "../utils/depreciation";
import {
  Calculator,
  FileText,
  Wrench,
  RefreshCw,
  Download,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Workbench() {
  const {
    equipments,
    contracts,
    maintenances,
    repurchases,
    depreciationLogs,
    selectedEquipmentId,
    setSelectedEquipment,
  } = useStore();
  const navigate = useNavigate();

  const selectedEquipment = useMemo(
    () => equipments.find((e) => e.id === selectedEquipmentId) ?? equipments[0],
    [equipments, selectedEquipmentId]
  );

  const selectedLogs = useMemo(() => {
    if (!selectedEquipment) return [];
    const logs = depreciationLogs.filter((l) => l.equipmentId === selectedEquipment.id);
    if (logs.length > 0) return logs;
    return generateDepreciationSchedule(
      selectedEquipment,
      maintenances.filter((m) => m.equipmentId === selectedEquipment.id)
    );
  }, [selectedEquipment, depreciationLogs, maintenances]);

  const alerts = useMemo(() => {
    const list: { equipmentId: string; equipmentNo: string; type: string; message: string }[] = [];
    equipments.forEach((eq) => {
      const logs = depreciationLogs.filter((l) => l.equipmentId === eq.id);
      if (logs.length === 0) return;
      const abnormalLogs = logs.filter((l) => l.isAbnormal);
      if (abnormalLogs.length > 0) {
        abnormalLogs.slice(0, 2).forEach((l) => {
          list.push({
            equipmentId: eq.id,
            equipmentNo: eq.equipmentNo,
            type: "折旧异常",
            message: `第${l.month}月: ${l.abnormalReason ?? "账面净值异常"}`,
          });
        });
      }
    });
    const earlyRepurchases = repurchases.filter((r) => r.isEarlyRepurchase);
    earlyRepurchases.forEach((r) => {
      const eq = equipments.find((e) => e.id === r.equipmentId);
      if (eq) {
        list.push({
          equipmentId: r.equipmentId,
          equipmentNo: eq.equipmentNo,
          type: "提前回购",
          message: `计划回购日 ${formatDate(r.plannedDate)}，回购价 ${formatCurrency(r.repurchasePrice)}`,
        });
      }
    });
    const maintAdj = maintenances.filter((m) => m.valueAdjustment > 0);
    maintAdj.forEach((m) => {
      const eq = equipments.find((e) => e.id === m.equipmentId);
      if (eq) {
        list.push({
          equipmentId: m.equipmentId,
          equipmentNo: eq.equipmentNo,
          type: "维修增值",
          message: `${formatDate(m.maintenanceDate)} ${m.description} 调整 ${formatCurrency(m.valueAdjustment)}`,
        });
      }
    });
    return list.slice(0, 8);
  }, [equipments, depreciationLogs, repurchases, maintenances]);

  const totalOriginal = equipments.reduce((s, e) => s + e.originalValue, 0);
  const totalCurrent = equipments.reduce(
    (s, e) =>
      s +
      getCurrentBookValue(
        e,
        maintenances.filter((m) => m.equipmentId === e.id)
      ),
    0
  );

  if (!selectedEquipment) return null;

  const currentBookValue = getCurrentBookValue(
    selectedEquipment,
    maintenances.filter((m) => m.equipmentId === selectedEquipment.id)
  );

  const eqMaintenances = maintenances.filter((m) => m.equipmentId === selectedEquipment.id);
  const eqContracts = contracts.filter((c) => c.equipmentId === selectedEquipment.id);
  const eqRepurchase = repurchases.find((r) => r.equipmentId === selectedEquipment.id);
  const hasAbnormal = depreciationLogs
    .filter((l) => l.equipmentId === selectedEquipment.id)
    .some((l) => l.isAbnormal);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">残值工作台</h1>
          <p className="text-sm text-navy-500 mt-1">设备残值评估总览 · 数据来源可追溯 · 异常即时可见</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg px-4 py-2 border border-navy-100">
            <div className="text-xs text-navy-400">设备总数</div>
            <div className="text-xl font-bold text-navy-900 font-mono">{equipments.length}</div>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 border border-navy-100">
            <div className="text-xs text-navy-400">原值合计</div>
            <div className="text-xl font-bold text-navy-900 font-mono">
              {formatCurrency(totalOriginal)}
            </div>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 border border-amber-400 bg-amber-400/5">
            <div className="text-xs text-amber-600">净值合计</div>
            <div className="text-xl font-bold text-amber-500 font-mono">
              {formatCurrency(totalCurrent)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-navy-900">设备列表</h2>
              <div className="flex items-center gap-1 text-xs text-navy-400">
                <TrendingDown size={12} />
                点击设备查看详情
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {equipments.map((eq) => {
                const eqMaint = maintenances.filter((m) => m.equipmentId === eq.id);
                const eqAbnormal = depreciationLogs
                  .filter((l) => l.equipmentId === eq.id)
                  .some((l) => l.isAbnormal);
                const eqRep = repurchases.find((r) => r.equipmentId === eq.id);
                return (
                  <EquipmentCard
                    key={eq.id}
                    equipment={eq}
                    currentValue={getCurrentBookValue(eq, eqMaint)}
                    hasAbnormal={eqAbnormal}
                    hasMaintenance={eqMaint.some((m) => m.valueAdjustment !== 0)}
                    hasRepurchase={!!eqRep}
                    isSelected={eq.id === selectedEquipment.id}
                    onSelect={setSelectedEquipment}
                  />
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-navy-900">折旧曲线</h2>
                <p className="text-xs text-navy-400 mt-0.5">
                  {selectedEquipment.equipmentNo} · {selectedEquipment.name}
                </p>
              </div>
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
              equipment={selectedEquipment}
              logs={selectedLogs}
              maintenances={eqMaintenances}
              height={240}
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => navigate("/depreciation")}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-navy-100 hover:border-amber-400 hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-400/10 flex items-center justify-center group-hover:bg-amber-400/20">
                <Calculator size={18} className="text-amber-500" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-navy-900">折旧试算</div>
                <div className="text-xs text-navy-400">参数配置·实时计算</div>
              </div>
            </button>
            <button
              onClick={() => navigate("/contracts")}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-navy-100 hover:border-amber-400 hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center group-hover:bg-navy-200">
                <FileText size={18} className="text-navy-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-navy-900">合同中心</div>
                <div className="text-xs text-navy-400">版本追踪·差异对比</div>
              </div>
            </button>
            <button
              onClick={() => navigate("/maintenance")}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-navy-100 hover:border-amber-400 hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center group-hover:bg-navy-200">
                <Wrench size={18} className="text-navy-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-navy-900">维修记录</div>
                <div className="text-xs text-navy-400">价值调整·影响评估</div>
              </div>
            </button>
            <button
              onClick={() => navigate("/repurchase")}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-navy-100 hover:border-amber-400 hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center group-hover:bg-navy-200">
                <RefreshCw size={18} className="text-navy-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-navy-900">回购管理</div>
                <div className="text-xs text-navy-400">状态追踪·风险提示</div>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h2 className="text-sm font-semibold text-navy-900 mb-4">设备详情</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-navy-400">设备编号</span>
                <span className="font-mono text-navy-900">{selectedEquipment.equipmentNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">设备名称</span>
                <span className="text-navy-900">{selectedEquipment.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">原值</span>
                <span className="font-mono text-navy-900">{formatCurrency(selectedEquipment.originalValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">残值率</span>
                <span className="text-navy-900">{(selectedEquipment.residualRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">预计残值</span>
                <span className="font-mono text-navy-900">
                  {formatCurrency(selectedEquipment.originalValue * selectedEquipment.residualRate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">折旧方法</span>
                <span className="text-navy-900">
                  {selectedEquipment.depreciationMethod === "straight"
                    ? "直线法"
                    : selectedEquipment.depreciationMethod === "doubleDeclining"
                    ? "双倍余额递减法"
                    : "年数总和法"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">折旧期限</span>
                <span className="text-navy-900">{selectedEquipment.depreciationMonths}个月</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-400">起始日期</span>
                <span className="text-navy-900">{formatDate(selectedEquipment.startDate)}</span>
              </div>
              <div className="pt-3 mt-3 border-t border-navy-100 flex justify-between">
                <span className="text-navy-400">当前账面净值</span>
                <span className="font-mono font-bold text-amber-500">
                  {formatCurrency(currentBookValue)}
                </span>
              </div>
              {hasAbnormal && (
                <div className="flex items-center gap-2 px-3 py-2 bg-danger-400/10 rounded-lg text-danger-400 text-xs">
                  <AlertTriangle size={12} />
                  存在折旧异常项，请查看折旧试算
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h2 className="text-sm font-semibold text-navy-900 mb-4">合同与回购</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-navy-400 mb-1">当前合同</div>
                {eqContracts.find((c) => c.isCurrent) ? (
                  <div className="p-2 bg-navy-50 rounded-lg">
                    <div className="font-medium text-navy-900">
                      {eqContracts.find((c) => c.isCurrent)?.version}
                    </div>
                    <div className="text-xs text-navy-400">
                      {formatDate(eqContracts.find((c) => c.isCurrent)?.signDate ?? "")}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-navy-400">无有效合同</div>
                )}
              </div>
              <div>
                <div className="text-xs text-navy-400 mb-1">维修记录</div>
                <div className="text-sm text-navy-900">
                  {eqMaintenances.length} 条
                  {eqMaintenances.some((m) => m.valueAdjustment !== 0) && (
                    <span className="text-amber-600"> · 含价值调整</span>
                  )}
                </div>
              </div>
              {eqRepurchase && (
                <div>
                  <div className="text-xs text-navy-400 mb-1">回购状态</div>
                  <div
                    className={`p-2 rounded-lg ${
                      eqRepurchase.isEarlyRepurchase
                        ? "bg-danger-400/10 text-danger-400"
                        : "bg-navy-50 text-navy-900"
                    }`}
                  >
                    <div className="font-medium">
                      {eqRepurchase.status === "pending"
                        ? "待回购"
                        : eqRepurchase.status === "completed"
                        ? "已回购"
                        : "已取消"}
                    </div>
                    <div className="text-xs">
                      {eqRepurchase.isEarlyRepurchase ? "⚠ 提前回购" : "正常到期"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-navy-900">异常告警</h2>
              {alerts.length > 0 && (
                <span className="text-xs text-danger-400">{alerts.length} 项</span>
              )}
            </div>
            {alerts.length === 0 ? (
              <div className="text-sm text-navy-400 text-center py-6">暂无异常</div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg text-xs border border-transparent hover:border-navy-200 cursor-pointer"
                    onClick={() => setSelectedEquipment(alert.equipmentId)}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} className={
                        alert.type === "提前回购" ? "text-danger-400" : "text-amber-500"
                      } />
                      <span className="font-medium text-navy-900">{alert.type}</span>
                      <span className="font-mono text-navy-400">{alert.equipmentNo}</span>
                    </div>
                    <div className="text-navy-500 mt-1 ml-5">{alert.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/report")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-colors"
          >
            <Download size={16} />
            导出残值评估报告
          </button>
        </div>
      </div>
    </div>
  );
}
