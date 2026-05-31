import { useState } from "react";
import { Plus, Edit2, Trash2, Clock, AlertTriangle, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRatioStore } from "@/stores/ratioStore";

export default function Ratio() {
  const { ratioVersions, addRatioVersion, updateRatioVersion, deleteRatioVersion } =
    useRatioStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    personalRatio: 0,
    companyRatio: 0,
    effectiveMonth: "",
    expireMonth: "",
    isDelayed: false,
    delayedMonths: 0,
    description: "",
  });

  const sortedVersions = [...ratioVersions].sort(
    (a, b) =>
      new Date(b.effectiveMonth).getTime() - new Date(a.effectiveMonth).getTime()
  );

  const handleAdd = () => {
    if (!formData.effectiveMonth) return;
    addRatioVersion({
      ...formData,
      personalRatio: formData.personalRatio / 100,
      companyRatio: formData.companyRatio / 100,
    });
    resetForm();
    setShowAddModal(false);
  };

  const handleEdit = (version: typeof ratioVersions[0]) => {
    setFormData({
      personalRatio: version.personalRatio * 100,
      companyRatio: version.companyRatio * 100,
      effectiveMonth: version.effectiveMonth,
      expireMonth: version.expireMonth || "",
      isDelayed: version.isDelayed,
      delayedMonths: version.delayedMonths || 0,
      description: version.description || "",
    });
    setEditingId(version.id);
    setShowAddModal(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateRatioVersion(editingId, {
        ...formData,
        personalRatio: formData.personalRatio / 100,
        companyRatio: formData.companyRatio / 100,
      });
    }
    resetForm();
    setShowAddModal(false);
    setEditingId(null);
  };

  const resetForm = () => {
    setFormData({
      personalRatio: 0,
      companyRatio: 0,
      effectiveMonth: "",
      expireMonth: "",
      isDelayed: false,
      delayedMonths: 0,
      description: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">缴费比例</h1>
          <p className="text-slate-500 mt-1">管理缴费比例版本与生效区间</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增版本
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-6">比例版本时间线</h3>
        <div className="space-y-4">
          {sortedVersions.map((version, index) => (
            <div key={version.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border-2",
                    version.isDelayed
                      ? "bg-amber-500 border-amber-600"
                      : "bg-green-500 border-green-600"
                  )}
                />
                {index < sortedVersions.length - 1 && (
                  <div className="w-0.5 h-full bg-slate-200 mt-1" />
                )}
              </div>
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-slate-800">
                        {version.effectiveMonth}
                        {version.expireMonth ? ` ~ ${version.expireMonth}` : " ~ 至今"}
                      </h4>
                      {version.isDelayed && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          延迟{version.delayedMonths}个月
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 mt-2 text-sm text-slate-600">
                      <span>
                        个人比例:{" "}
                        <strong>
                          {(version.personalRatio * 100).toFixed(1)}%
                        </strong>
                      </span>
                      <span>
                        企业比例:{" "}
                        <strong>
                          {(version.companyRatio * 100).toFixed(1)}%
                        </strong>
                      </span>
                    </div>
                    {version.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {version.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(version)}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRatioVersion(version.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedVersions.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">暂无缴费比例版本</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingId ? "编辑比例版本" : "新增比例版本"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    个人比例 (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.personalRatio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalRatio: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    企业比例 (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.companyRatio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyRatio: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    生效月份
                  </label>
                  <input
                    type="month"
                    value={formData.effectiveMonth}
                    onChange={(e) =>
                      setFormData({ ...formData, effectiveMonth: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    失效月份
                  </label>
                  <input
                    type="month"
                    value={formData.expireMonth}
                    onChange={(e) =>
                      setFormData({ ...formData, expireMonth: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDelayed}
                    onChange={(e) =>
                      setFormData({ ...formData, isDelayed: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    延迟到版
                  </span>
                </label>
              </div>
              {formData.isDelayed && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    延迟月数
                  </label>
                  <input
                    type="number"
                    value={formData.delayedMonths}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delayedMonths: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  说明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={editingId ? handleSave : handleAdd}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingId ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
