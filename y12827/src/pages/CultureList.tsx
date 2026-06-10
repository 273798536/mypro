import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Plus, ChevronRight, History } from "lucide-react";
import { useStore } from "@/store";
import type { CultureRecord } from "@/types";

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 bg-stone-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default function CultureList() {
  const { cultureRecords, fetchCultureRecords, createCultureRecord, loading, error } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [sampleId, setSampleId] = useState("");
  const [conclusion, setConclusion] = useState("");

  useEffect(() => {
    fetchCultureRecords();
  }, [fetchCultureRecords]);

  const handleCreate = async () => {
    if (!sampleId.trim() || !conclusion.trim()) return;
    await createCultureRecord(sampleId.trim(), conclusion.trim(), "张技师");
    setShowModal(false);
    setSampleId("");
    setConclusion("");
  };

  if (error) {
    return (
      <div className="card border border-red-200 text-red-600 text-sm p-4">
        加载失败：{error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-stone-800 flex items-center gap-2.5">
            <FlaskConical size={24} className="text-brand" />
            培养记录
          </h1>
          <p className="text-sm text-stone-400 mt-1">管理培养记录，查看历史变更与审计日志</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowModal(true)}>
          <Plus size={16} /> 新建记录
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading && !cultureRecords.length ? (
          <div className="p-5"><Skeleton /></div>
        ) : !cultureRecords.length ? (
          <div className="p-10 text-center text-stone-400 text-sm">暂无培养记录</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-stone-400 text-left">
                <th className="px-5 py-3 font-medium">样本ID</th>
                <th className="px-5 py-3 font-medium">当前结论</th>
                <th className="px-5 py-3 font-medium">版本数</th>
                <th className="px-5 py-3 font-medium">更新时间</th>
                <th className="px-5 py-3 font-medium">更新人</th>
                <th className="px-5 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {cultureRecords.map((r: CultureRecord) => (
                <tr
                  key={r.id}
                  className="border-b border-stone-50 hover:bg-stone-50/60 transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-stone-700">{r.sample_id}</td>
                  <td className="px-5 py-3 text-stone-600 max-w-[200px] truncate">{r.conclusion}</td>
                  <td className="px-5 py-3 text-stone-600 flex items-center gap-1">
                    {r.current_version}
                    {r.current_version > 1 && <History size={14} className="text-brand" />}
                  </td>
                  <td className="px-5 py-3 text-stone-400">{r.updated_at}</td>
                  <td className="px-5 py-3 text-stone-500">{r.updated_by}</td>
                  <td className="px-5 py-3">
                    <Link to={`/cultures/${r.id}`} className="text-brand hover:text-brand-dark">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="card w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-serif text-stone-800">新建培养记录</h3>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">样本ID</label>
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
                value={sampleId}
                onChange={(e) => setSampleId(e.target.value)}
                placeholder="输入样本ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">结论</label>
              <textarea
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand resize-none"
                rows={4}
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder="输入培养结论"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-secondary" onClick={() => { setShowModal(false); setSampleId(""); setConclusion(""); }}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!sampleId.trim() || !conclusion.trim()}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
