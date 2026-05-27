import { useState } from "react";
import { useStore } from "../store/useStore";
import {
  formatCurrency,
  formatDate,
  getCurrentBookValue,
} from "../utils/depreciation";
import { RefreshCw, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { RepurchaseStatus } from "../types";

export default function Repurchase() {
  const { equipments, repurchases, contracts, maintenances, updateRepurchase } = useStore();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(
    equipments[0]?.id ?? ""
  );
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: "none" as RepurchaseStatus,
    repurchasePrice: 0,
    plannedDate: "",
    actualDate: "",
    isEarlyRepurchase: false,
  });

  const selectedEquipment = equipments.find((e) => e.id === selectedEquipmentId);
  const eqRepurchase = repurchases.find((r) => r.equipmentId === selectedEquipmentId);
  const eqContract = contracts.find(
    (c) => c.equipmentId === selectedEquipmentId && c.isCurrent
  );
  const eqMaintenances = maintenances.filter((m) => m.equipmentId === selectedEquipmentId);

  const currentBookValue = selectedEquipment
    ? getCurrentBookValue(selectedEquipment, eqMaintenances)
    : 0;

  const handleEdit = () => {
    if (eqRepurchase) {
      setEditData({
        status: eqRepurchase.status,
        repurchasePrice: eqRepurchase.repurchasePrice,
        plannedDate: eqRepurchase.plannedDate,
        actualDate: eqRepurchase.actualDate ?? "",
        isEarlyRepurchase: eqRepurchase.isEarlyRepurchase,
      });
    }
    setEditing(true);
  };

  const handleSave = () => {
    updateRepurchase(selectedEquipmentId, editData);
    setEditing(false);
  };

  const priceDifference = eqRepurchase
    ? eqRepurchase.repurchasePrice - currentBookValue
    : 0;

  const statusConfig: Record<
    RepurchaseStatus,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    none: {
      label: "无回购计划",
      color: "bg-navy-100 text-navy-600",
      icon: <XCircle size={14} />,
    },
    pending: {
      label: "待回购",
      color: "bg-amber-100 text-amber-700",
      icon: <Clock size={14} />,
    },
    completed: {
      label: "已回购",
      color: "bg-emerald-100 text-emerald-700",
      icon: <CheckCircle2 size={14} />,
    },
    cancelled: {
      label: "已取消",
      color: "bg-gray-100 text-gray-600",
      icon: <XCircle size={14} />,
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">回购管理</h1>
          <p className="text-sm text-navy-500 mt-1">回购状态追踪 · 提前回购风险提示 · 价差计算</p>
        </div>
        <button
          onClick={handleEdit}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 text-sm"
        >
          <RefreshCw size={14} />
          更新回购状态
        </button>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 p-5">
        <label className="block text-xs text-navy-500 mb-2">选择设备</label>
        <select
          value={selectedEquipmentId}
          onChange={(e) => setSelectedEquipmentId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        >
          {equipments.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.equipmentNo} - {eq.name}
            </option>
          ))}
        </select>
      </div>

      {selectedEquipment && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-navy-100 p-5">
              <h2 className="text-sm font-semibold text-navy-900 mb-4">回购状态</h2>
              {eqRepurchase ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig[eqRepurchase.status].color}`}
                    >
                      {statusConfig[eqRepurchase.status].icon}
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-navy-900">
                        {statusConfig[eqRepurchase.status].label}
                      </div>
                      {eqRepurchase.isEarlyRepurchase && (
                        <div className="flex items-center gap-1 text-xs text-danger-400 mt-0.5">
                          <AlertTriangle size={12} />
                          提前回购
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-navy-100">
                    <div>
                      <div className="text-xs text-navy-400">回购价格</div>
                      <div className="text-lg font-bold font-mono text-navy-900">
                        {formatCurrency(eqRepurchase.repurchasePrice)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-navy-400">当前账面净值</div>
                      <div className="text-lg font-bold font-mono text-amber-500">
                        {formatCurrency(currentBookValue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-navy-400">价差</div>
                      <div
                        className={`text-lg font-bold font-mono ${
                          priceDifference >= 0 ? "text-emerald-600" : "text-danger-400"
                        }`}
                      >
                        {priceDifference >= 0 ? "+" : ""}
                        {formatCurrency(priceDifference)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-navy-400">计划回购日</div>
                      <div className="text-sm font-medium text-navy-900">
                        {formatDate(eqRepurchase.plannedDate)}
                      </div>
                    </div>
                    {eqRepurchase.actualDate && (
                      <div>
                        <div className="text-xs text-navy-400">实际回购日</div>
                        <div className="text-sm font-medium text-navy-900">
                          {formatDate(eqRepurchase.actualDate)}
                        </div>
                      </div>
                    )}
                  </div>

                  {eqRepurchase.isEarlyRepurchase && (
                    <div className="mt-4 p-3 bg-danger-400/10 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-danger-400">
                        <AlertTriangle size={14} />
                        提前回购风险提示
                      </div>
                      <div className="text-xs text-navy-600 mt-2">
                        该设备为提前回购，回购价格与账面净值差异为{" "}
                        <span
                          className={`font-mono font-medium ${
                            priceDifference >= 0 ? "text-emerald-600" : "text-danger-400"
                          }`}
                        >
                          {formatCurrency(priceDifference)}
                        </span>
                        。请确认回购条款中是否有提前回购违约金约定。
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-navy-400 text-center py-8">
                  该设备暂无回购记录，点击右上角按钮创建
                </div>
              )}
            </div>

            {eqContract && (
              <div className="bg-white rounded-xl border border-navy-100 p-5">
                <h2 className="text-sm font-semibold text-navy-900 mb-4">回购条款</h2>
                <div className="p-3 bg-navy-50 rounded-lg text-sm text-navy-700">
                  {eqContract.repurchaseClause}
                </div>
                <div className="mt-3 text-xs text-navy-400">
                  合同版本: {eqContract.version} · {formatDate(eqContract.signDate)}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-navy-100 p-5">
              <h2 className="text-sm font-semibold text-navy-900 mb-4">回购流程</h2>
              <div className="space-y-3">
                {(["pending", "completed", "cancelled"] as RepurchaseStatus[]).map(
                  (status) => {
                    const isActive = eqRepurchase?.status === status;
                    const isDone =
                      eqRepurchase &&
                      ((status === "completed" && eqRepurchase.status === "completed") ||
                        (status === "cancelled" && eqRepurchase.status === "cancelled"));
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                            isActive
                              ? "bg-amber-400 text-white"
                              : isDone
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-navy-100 text-navy-400"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 size={14} />
                          ) : isActive ? (
                            <Clock size={14} />
                          ) : (
                            status === "cancelled" ? (
                              <XCircle size={14} />
                            ) : (
                              <Clock size={14} />
                            )
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            isActive || isDone ? "text-navy-900" : "text-navy-400"
                          }`}
                        >
                          {statusConfig[status].label}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-navy-100 p-5">
              <h2 className="text-sm font-semibold text-navy-900 mb-4">价差分析</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-navy-400">回购价格</span>
                  <span className="font-mono text-navy-900">
                    {eqRepurchase ? formatCurrency(eqRepurchase.repurchasePrice) : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">账面净值</span>
                  <span className="font-mono text-amber-500">
                    {formatCurrency(currentBookValue)}
                  </span>
                </div>
                <div className="h-px bg-navy-100 my-2" />
                <div className="flex justify-between">
                  <span className="text-navy-400">价差</span>
                  <span
                    className={`font-mono font-bold ${
                      priceDifference >= 0 ? "text-emerald-600" : "text-danger-400"
                    }`}
                  >
                    {priceDifference >= 0 ? "+" : ""}
                    {formatCurrency(priceDifference)}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-navy-500">
                价差 = 回购价格 - 当前账面净值。正数表示回购价格高于净值，负数表示回购价格低于净值。
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">更新回购状态</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-navy-500 mb-1">回购状态</label>
                <select
                  value={editData.status}
                  onChange={(e) =>
                    setEditData((p) => ({
                      ...p,
                      status: e.target.value as RepurchaseStatus,
                    }))
                  }
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                >
                  <option value="none">无回购计划</option>
                  <option value="pending">待回购</option>
                  <option value="completed">已回购</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">回购价格（元）</label>
                <input
                  type="number"
                  value={editData.repurchasePrice}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, repurchasePrice: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-navy-500 mb-1">计划回购日</label>
                  <input
                    type="date"
                    value={editData.plannedDate}
                    onChange={(e) =>
                      setEditData((p) => ({ ...p, plannedDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-500 mb-1">实际回购日</label>
                  <input
                    type="date"
                    value={editData.actualDate}
                    onChange={(e) =>
                      setEditData((p) => ({ ...p, actualDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="earlyRepurchase"
                  checked={editData.isEarlyRepurchase}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, isEarlyRepurchase: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-navy-300 text-amber-500 focus:ring-amber-400"
                />
                <label
                  htmlFor="earlyRepurchase"
                  className="text-sm text-navy-700"
                >
                  标记为提前回购
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2 text-sm border border-navy-200 rounded-lg text-navy-600 hover:bg-navy-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 text-sm bg-navy-900 text-white rounded-lg hover:bg-navy-800"
              >
                确认更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
