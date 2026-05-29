import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import EntryEditModal from "@/components/EntryEditModal";
import CompareTable from "@/components/CompareTable";
import type { Entry } from "../../shared/types";

export default function CorrectionPage() {
  const {
    correctionLoading,
    comparisonData,
    correctionHistory,
    updateEntry,
    addEntry,
    fetchComparison,
    fetchCorrectionHistory,
    selectedVersion,
    allocationResults,
    fetchAllocationResults,
  } = useStore();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [searchNo, setSearchNo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [oldVersion, setOldVersion] = useState("");
  const [newVersion, setNewVersion] = useState("");

  const pageSize = 10;

  useEffect(() => {
    fetchAllocationResults(selectedVersion ?? undefined);
    fetchCorrectionHistory();
  }, [fetchAllocationResults, fetchCorrectionHistory, selectedVersion]);

  useEffect(() => {
    fetch("/api/correction/entries")
      .then((res) => res.json())
      .then((data) => setEntries(data || []))
      .catch(() => {});
  }, [correctionLoading]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const filteredEntries = entries.filter((e) =>
    e.cardNo.toLowerCase().includes(searchNo.toLowerCase())
  );
  const totalPages = Math.ceil(filteredEntries.length / pageSize);
  const pagedEntries = filteredEntries.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const versions = Array.from(
    new Set([
      ...correctionHistory.map((h) => h.oldVersion),
      ...correctionHistory.map((h) => h.newVersion),
      ...(selectedVersion ? [selectedVersion] : []),
    ])
  );

  const handleInlineEdit = async (
    id: string,
    field: string,
    value: string
  ) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    await updateEntry(id, "update", { [field]: value } as Partial<Entry>);
    showToast("已修正，分摊结果已重新计算");
    setEditingId(null);
    setEditField(null);
  };

  const handleDelete = async (id: string) => {
    await updateEntry(id, "delete");
    showToast("已删除，分摊结果已重新计算");
    setShowDeleteConfirm(null);
  };

  const handleAdd = async (entry: Partial<Entry>) => {
    await addEntry(entry);
    showToast("已新增，分摊结果已重新计算");
  };

  const handleCompare = () => {
    if (oldVersion && newVersion) {
      fetchComparison(oldVersion, newVersion);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-primary">手动修正</h2>
        <p className="text-sm text-gray-500 mt-1">
          修正入园记录并查看新旧分摊对比
        </p>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">入园记录修正</h3>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="搜索年卡号"
                value={searchNo}
                onChange={(e) => {
                  setSearchNo(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm w-40"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-white px-4 py-1.5 rounded-md text-sm flex items-center gap-1 hover:bg-primary/90"
            >
              <Plus size={14} />
              新增入园记录
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-3 px-2">年卡号</th>
                <th className="text-left py-3 px-2">景点</th>
                <th className="text-left py-3 px-2">入园时间</th>
                <th className="text-left py-3 px-2">刷卡流水号</th>
                <th className="text-left py-3 px-2">是否去重</th>
                <th className="text-right py-3 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedEntries.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2.5 px-2">{e.cardNo}</td>
                  <td className="py-2.5 px-2">{e.scenicSpotName}</td>
                  <td className="py-2.5 px-2">
                    {editingId === e.id && editField === "entryTime" ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="datetime-local"
                          value={editValue}
                          onChange={(ev) => setEditValue(ev.target.value)}
                          className="border border-primary rounded px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() =>
                            handleInlineEdit(e.id, "entryTime", editValue)
                          }
                          className="text-green-600"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditField(null);
                          }}
                          className="text-gray-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer hover:text-primary"
                        onClick={() => {
                          setEditingId(e.id);
                          setEditField("entryTime");
                          setEditValue(e.entryTime);
                        }}
                      >
                        {e.entryTime}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2">{e.swipeSerialNo}</td>
                  <td className="py-2.5 px-2">
                    {e.isDeduplicated ? (
                      <span className="text-danger text-xs">是</span>
                    ) : (
                      <span className="text-gray-400 text-xs">否</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    {showDeleteConfirm === e.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-danger">确认删除?</span>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-xs text-danger font-medium"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="text-xs text-gray-500"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(e.id)}
                        className="text-danger hover:text-danger/80"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-500">
              共 {filteredEntries.length} 条，第 {page}/{totalPages} 页
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-4">新旧对比</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">旧版本:</label>
            <select
              value={oldVersion}
              onChange={(e) => setOldVersion(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">选择版本</option>
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">新版本:</label>
            <select
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">选择版本</option>
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCompare}
            disabled={!oldVersion || !newVersion || correctionLoading}
            className="bg-primary text-white px-6 py-1.5 rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            对比
          </button>
        </div>

        {comparisonData && (
          <CompareTable
            oldResults={comparisonData.old}
            newResults={comparisonData.new}
            diffs={comparisonData.diffs}
          />
        )}
      </div>

      <EntryEditModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAdd}
      />
    </div>
  );
}
