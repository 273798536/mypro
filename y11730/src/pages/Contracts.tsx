import { useState } from "react";
import { useStore } from "../store/useStore";
import { formatDate } from "../utils/depreciation";
import { FileText, Plus, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export default function Contracts() {
  const { equipments, contracts, setCurrentContract, addContract, addAuditLog } =
    useStore();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(
    equipments[0]?.id ?? ""
  );
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContract, setNewContract] = useState({
    version: "",
    signDate: "",
    depreciationClause: "",
    repurchaseClause: "",
  });

  const selectedEquipment = equipments.find((e) => e.id === selectedEquipmentId);
  const eqContracts = contracts.filter((c) => c.equipmentId === selectedEquipmentId);

  const handleSetCurrent = (contractId: string) => {
    setCurrentContract(selectedEquipmentId, contractId);
  };

  const handleAddContract = () => {
    if (!selectedEquipmentId || !newContract.version || !newContract.signDate) {
      alert("请填写版本号和签订日期");
      return;
    }
    addContract({
      equipmentId: selectedEquipmentId,
      version: newContract.version,
      signDate: newContract.signDate,
      depreciationClause: newContract.depreciationClause,
      repurchaseClause: newContract.repurchaseClause,
      isCurrent: false,
    });
    setNewContract({
      version: "",
      signDate: "",
      depreciationClause: "",
      repurchaseClause: "",
    });
    setShowAddForm(false);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const compareContracts = compareMode && compareIds.length === 2
    ? [
        contracts.find((c) => c.id === compareIds[0]),
        contracts.find((c) => c.id === compareIds[1]),
      ].filter(Boolean)
    : [];

  const fieldDiffs = compareContracts.length === 2
    ? {
        depreciationClause:
          compareContracts[0]?.depreciationClause !==
          compareContracts[1]?.depreciationClause,
        repurchaseClause:
          compareContracts[0]?.repurchaseClause !==
          compareContracts[1]?.repurchaseClause,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">合同中心</h1>
          <p className="text-sm text-navy-500 mt-1">合同版本管理 · 差异对比 · 条款追溯</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareIds([]);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              compareMode
                ? "bg-amber-400 text-white"
                : "border border-navy-200 text-navy-600 hover:bg-navy-50"
            }`}
          >
            <FileText size={14} />
            {compareMode ? "退出对比" : "版本对比"}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 text-sm"
          >
            <Plus size={14} />
            新增合同版本
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 p-5">
        <label className="block text-xs text-navy-500 mb-2">选择设备</label>
        <select
          value={selectedEquipmentId}
          onChange={(e) => {
            setSelectedEquipmentId(e.target.value);
            setCompareIds([]);
          }}
          className="w-full max-w-md px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        >
          {equipments.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.equipmentNo} - {eq.name}
            </option>
          ))}
        </select>
      </div>

      {compareMode && compareContracts.length === 2 && fieldDiffs && (
        <div className="bg-white rounded-xl border border-amber-400/30 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-navy-900">版本差异对比</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {compareContracts.map((c, idx) => (
              <div key={c?.id} className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-navy-900">{c?.version}</span>
                  <span className="text-xs text-navy-400">
                    {formatDate(c?.signDate ?? "")}
                  </span>
                  {c?.isCurrent && (
                    <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                      当前版本
                    </span>
                  )}
                </div>
                <div
                  className={`p-3 rounded-lg text-xs ${
                    fieldDiffs.depreciationClause
                      ? "bg-amber-400/10 border border-amber-400/30"
                      : "bg-navy-50"
                  }`}
                >
                  <div className="text-navy-400 mb-1">折旧条款</div>
                  <div className="text-navy-900">{c?.depreciationClause}</div>
                </div>
                <div
                  className={`p-3 rounded-lg text-xs ${
                    fieldDiffs.repurchaseClause
                      ? "bg-amber-400/10 border border-amber-400/30"
                      : "bg-navy-50"
                  }`}
                >
                  <div className="text-navy-400 mb-1">回购条款</div>
                  <div className="text-navy-900">{c?.repurchaseClause}</div>
                </div>
              </div>
            ))}
          </div>
          {(fieldDiffs.depreciationClause || fieldDiffs.repurchaseClause) && (
            <div className="mt-4 p-3 bg-navy-50 rounded-lg text-xs text-navy-600">
              <span className="text-amber-600 font-medium">差异说明：</span>
              {fieldDiffs.depreciationClause && <span>折旧条款发生变更；</span>}
              {fieldDiffs.repurchaseClause && <span>回购条款发生变更。</span>}
              请确认条款变更是否影响当前残值计算。
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-navy-100 p-5">
        <h2 className="text-sm font-semibold text-navy-900 mb-4">
          合同版本列表
          {compareMode && compareIds.length > 0 && (
            <span className="ml-2 text-xs text-navy-400">
              已选 {compareIds.length}/2
            </span>
          )}
        </h2>
        <div className="space-y-3">
          {eqContracts.length === 0 ? (
            <div className="text-sm text-navy-400 text-center py-8">该设备暂无合同记录</div>
          ) : (
            eqContracts.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border transition-all ${
                  compareMode
                    ? compareIds.includes(c.id)
                      ? "border-amber-400 bg-amber-400/5 cursor-pointer"
                      : "border-navy-100 hover:border-navy-300 cursor-pointer"
                    : c.isCurrent
                    ? "border-emerald-400/50 bg-emerald-50"
                    : "border-navy-100"
                }`}
                onClick={() => compareMode && toggleCompare(c.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
                      <FileText size={18} className="text-navy-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-navy-900">{c.version}</span>
                        {c.isCurrent ? (
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            当前版本
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-navy-100 text-navy-500 rounded-full flex items-center gap-1">
                            <Clock size={10} />
                            历史版本
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-navy-400 mt-0.5">
                        签订日期：{formatDate(c.signDate)}
                      </div>
                    </div>
                  </div>
                  {!c.isCurrent && !compareMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetCurrent(c.id);
                      }}
                      className="text-xs text-amber-500 hover:text-amber-600 px-3 py-1 border border-amber-400/30 rounded hover:bg-amber-400/10"
                    >
                      设为当前版本
                    </button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                  <div className="p-2 bg-navy-50 rounded">
                    <div className="text-navy-400 mb-1">折旧条款</div>
                    <div className="text-navy-700">{c.depreciationClause}</div>
                  </div>
                  <div className="p-2 bg-navy-50 rounded">
                    <div className="text-navy-400 mb-1">回购条款</div>
                    <div className="text-navy-700">{c.repurchaseClause}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">新增合同版本</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-navy-500 mb-1">版本号</label>
                  <input
                    type="text"
                    value={newContract.version}
                    onChange={(e) =>
                      setNewContract((p) => ({ ...p, version: e.target.value }))
                    }
                    placeholder="例如 V1.2"
                    className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-500 mb-1">签订日期</label>
                  <input
                    type="date"
                    value={newContract.signDate}
                    onChange={(e) =>
                      setNewContract((p) => ({ ...p, signDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">折旧条款</label>
                <textarea
                  value={newContract.depreciationClause}
                  onChange={(e) =>
                    setNewContract((p) => ({ ...p, depreciationClause: e.target.value }))
                  }
                  placeholder="例如：直线法，10年，残值率5%"
                  rows={2}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">回购条款</label>
                <textarea
                  value={newContract.repurchaseClause}
                  onChange={(e) =>
                    setNewContract((p) => ({ ...p, repurchaseClause: e.target.value }))
                  }
                  placeholder="例如：到期回购价为残值金额，即原值的5%"
                  rows={2}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
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
                onClick={handleAddContract}
                className="flex-1 py-2 text-sm bg-navy-900 text-white rounded-lg hover:bg-navy-800"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
