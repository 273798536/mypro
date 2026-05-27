import { useState } from "react";
import { useStore } from "../store/useStore";
import { formatCurrency, formatDate, formatDateTime } from "../utils/depreciation";
import { Wrench, Plus, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export default function Maintenance() {
  const { equipments, maintenances, addMaintenance } = useStore();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(
    equipments[0]?.id ?? ""
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMaint, setNewMaint] = useState({
    maintenanceDate: "",
    description: "",
    cost: 0,
    valueAdjustment: 0,
    source: "",
    operator: "",
  });

  const selectedEquipment = equipments.find((e) => e.id === selectedEquipmentId);
  const eqMaintenances = maintenances
    .filter((m) => m.equipmentId === selectedEquipmentId)
    .sort((a, b) => b.maintenanceDate.localeCompare(a.maintenanceDate));

  const totalCost = eqMaintenances.reduce((s, m) => s + m.cost, 0);
  const totalAdjustment = eqMaintenances.reduce((s, m) => s + m.valueAdjustment, 0);
  const hasImpact = eqMaintenances.some((m) => m.valueAdjustment !== 0);

  const handleAdd = () => {
    if (!newMaint.maintenanceDate || !newMaint.description) {
      alert("请填写维修日期和描述");
      return;
    }
    addMaintenance({
      equipmentId: selectedEquipmentId,
      maintenanceDate: newMaint.maintenanceDate,
      description: newMaint.description,
      cost: newMaint.cost,
      valueAdjustment: newMaint.valueAdjustment,
      source: newMaint.source || "手动录入",
      operator: newMaint.operator || "当前用户",
    });
    setNewMaint({
      maintenanceDate: "",
      description: "",
      cost: 0,
      valueAdjustment: 0,
      source: "",
      operator: "",
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">维修记录</h1>
          <p className="text-sm text-navy-500 mt-1">维修历史追踪 · 价值调整可视化 · 来源追溯</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 text-sm"
        >
          <Plus size={14} />
          录入维修记录
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

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-navy-100 p-4">
          <div className="text-xs text-navy-400">维修次数</div>
          <div className="text-2xl font-bold text-navy-900 mt-1">{eqMaintenances.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-navy-100 p-4">
          <div className="text-xs text-navy-400">维修总费用</div>
          <div className="text-2xl font-bold text-navy-900 mt-1 font-mono">
            {formatCurrency(totalCost)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-navy-100 p-4">
          <div className="text-xs text-navy-400">价值调整合计</div>
          <div
            className={`text-2xl font-bold mt-1 font-mono ${
              totalAdjustment > 0 ? "text-emerald-600" : "text-navy-900"
            }`}
          >
            {totalAdjustment >= 0 ? "+" : ""}
            {formatCurrency(totalAdjustment)}
          </div>
        </div>
        <div className={`rounded-xl p-4 ${hasImpact ? "bg-amber-400/10 border border-amber-400/30" : "bg-white border border-navy-100"}`}>
          <div className={`text-xs ${hasImpact ? "text-amber-600" : "text-navy-400"}`}>对残值的影响</div>
          <div className={`text-2xl font-bold mt-1 ${hasImpact ? "text-amber-600" : "text-navy-900"}`}>
            {hasImpact ? "有调整" : "无影响"}
          </div>
        </div>
      </div>

      {hasImpact && selectedEquipment && (
        <div className="bg-white rounded-xl border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-navy-900">维修价值调整说明</h2>
          </div>
          <div className="text-xs text-navy-600 space-y-2">
            <p>以下维修记录包含价值调整，会影响折旧计算：</p>
            <ul className="space-y-1 ml-4">
              {eqMaintenances
                .filter((m) => m.valueAdjustment !== 0)
                .map((m) => (
                  <li key={m.id}>
                    <span className="text-amber-600 font-medium">
                      {formatDate(m.maintenanceDate)}
                    </span>
                    {" "}- {m.description} - 调整
                    <span className="font-mono text-amber-600">
                      {" "}
                      {m.valueAdjustment > 0 ? "+" : ""}
                      {formatCurrency(m.valueAdjustment)}
                    </span>
                    {" "}(来源: {m.source})
                  </li>
                ))}
            </ul>
            <p className="text-navy-500 mt-2">
              调整方式：维修增值部分在剩余折旧期内重新分摊；减值部分作为一次性调整，不影响后续折旧。
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-navy-100 p-5">
        <h2 className="text-sm font-semibold text-navy-900 mb-4">维修历史</h2>
        {eqMaintenances.length === 0 ? (
          <div className="text-sm text-navy-400 text-center py-8">该设备暂无维修记录</div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-navy-200" />
            <div className="space-y-5">
              {eqMaintenances.map((m) => (
                <div key={m.id} className="relative pl-14">
                  <div
                    className={`absolute left-4 w-4 h-4 rounded-full border-2 ${
                      m.valueAdjustment !== 0
                        ? "border-amber-400 bg-amber-400"
                        : "border-navy-300 bg-white"
                    }`}
                  />
                  <div className="p-4 bg-navy-50 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench size={14} className="text-navy-500" />
                        <span className="font-medium text-navy-900 text-sm">
                          {m.description}
                        </span>
                      </div>
                      <span className="text-xs text-navy-400">
                        {formatDate(m.maintenanceDate)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span className="text-navy-500">
                        费用: <span className="font-mono text-navy-700">{formatCurrency(m.cost)}</span>
                      </span>
                      {m.valueAdjustment !== 0 && (
                        <span
                          className={`flex items-center gap-1 ${
                            m.valueAdjustment > 0 ? "text-emerald-600" : "text-danger-400"
                          }`}
                        >
                          {m.valueAdjustment > 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          价值调整: <span className="font-mono">{formatCurrency(m.valueAdjustment)}</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-navy-400">
                      来源: {m.source} · 操作人: {m.operator} ·{" "}
                      {formatDateTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">录入维修记录</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-navy-500 mb-1">维修日期</label>
                  <input
                    type="date"
                    value={newMaint.maintenanceDate}
                    onChange={(e) =>
                      setNewMaint((p) => ({ ...p, maintenanceDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-500 mb-1">操作人</label>
                  <input
                    type="text"
                    value={newMaint.operator}
                    onChange={(e) =>
                      setNewMaint((p) => ({ ...p, operator: e.target.value }))
                    }
                    placeholder="当前用户"
                    className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">维修描述</label>
                <textarea
                  value={newMaint.description}
                  onChange={(e) =>
                    setNewMaint((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="例如：液压系统大修，更换主油泵"
                  rows={2}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-navy-500 mb-1">维修费用（元）</label>
                  <input
                    type="number"
                    value={newMaint.cost}
                    onChange={(e) =>
                      setNewMaint((p) => ({ ...p, cost: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-500 mb-1">价值调整（元）</label>
                  <input
                    type="number"
                    value={newMaint.valueAdjustment}
                    onChange={(e) =>
                      setNewMaint((p) => ({ ...p, valueAdjustment: Number(e.target.value) }))
                    }
                    placeholder="正数增值，负数减值"
                    className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">来源</label>
                <input
                  type="text"
                  value={newMaint.source}
                  onChange={(e) =>
                    setNewMaint((p) => ({ ...p, source: e.target.value }))
                  }
                  placeholder="例如：维修工单 WO-2024-1108"
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 text-sm border border-navy-200 rounded-lg text-navy-600 hover:bg-navy-50"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-2 text-sm bg-navy-900 text-white rounded-lg hover:bg-navy-800"
              >
                确认录入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
