import { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Save, FileText, RotateCcw, Clock } from "lucide-react";
import { useRecordStore } from "@/store/useRecordStore";
import Layout from "@/components/Layout";
import TLCPlate from "@/components/TLCPlate";
import InfoTable from "@/components/InfoTable";
import ComponentTable from "@/components/ComponentTable";
import ConclusionSection from "@/components/ConclusionSection";
import AnomalyCard from "@/components/AnomalyCard";
import StatusBadge from "@/components/StatusBadge";

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const { getRecord, updateRecord, clearSupplement } = useRecordStore();
  const record = id ? getRecord(id) : undefined;
  const [reactionTimeInput, setReactionTimeInput] = useState("");
  const [saved, setSaved] = useState(false);

  if (!record) {
    return <Navigate to="/" replace />;
  }

  const missingTime = !record.reactionTime;

  const handleSaveSupplement = () => {
    if (!reactionTimeInput.trim()) return;
    updateRecord(record.id, { reactionTime: reactionTimeInput.trim() });
    setReactionTimeInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    clearSupplement(record.id);
  };

  return (
    <Layout showBack backTo="/" title={`记录详情 · ${record.batchNo}`}>
      <div className="mb-6 animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2 className="font-serif text-2xl font-bold text-lab-ink">
            <span className="font-mono">{record.batchNo}</span>
          </h2>
          <StatusBadge status={record.status} />
          {record.isDuplicate && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-100 border border-red-200 text-red-700 rounded">
              批号重复 · 已拦截
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">{record.date} · {record.operator} · 展开剂 {record.solventRatio}</p>
      </div>

      {record.notes.length > 0 && (
        <div className="mb-8 space-y-3 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <h3 className="font-serif text-lg font-semibold text-lab-ink flex items-center gap-2">
            <span className="w-1 h-5 bg-lab-orange rounded-sm inline-block" />
            异常提示与说明
            <span className="text-xs font-sans font-normal text-slate-500">（可一键复制转发）</span>
          </h3>
          {record.notes.map((note, i) => (
            <AnomalyCard key={i} note={note} index={i} />
          ))}
        </div>
      )}

      {missingTime && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded animate-fade-in-up no-print">
          <div className="flex items-start gap-3">
            <Clock width={20} height={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 mb-1.5">补录反应时间</h4>
              <p className="text-sm text-amber-800 mb-3">
                反应时间未记录，补录后谱图判读说明与报告将自动更新。
              </p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={reactionTimeInput}
                  onChange={(e) => setReactionTimeInput(e.target.value)}
                  placeholder="例如：45 min 或 1.5 h"
                  className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-amber-300 rounded bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
                <button
                  onClick={handleSaveSupplement}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-lab-orange text-white rounded hover:bg-amber-600 transition-colors"
                >
                  <Save width={14} height={14} />
                  {saved ? "已保存" : "保存补录"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-5 mb-8">
        <div className="lg:col-span-2 animate-fade-in-up">
          <h3 className="font-serif text-lg font-semibold text-lab-ink mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-lab-blue rounded-sm inline-block" />
            薄层色谱谱图
          </h3>
          <div className="bg-white border border-slate-200 rounded p-4 shadow-paper flex justify-center">
            <TLCPlate record={record} width={320} height={480} />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            <h3 className="font-serif text-lg font-semibold text-lab-ink mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-lab-blue rounded-sm inline-block" />
              实验参数
            </h3>
            <InfoTable record={record} />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <h3 className="font-serif text-lg font-semibold text-lab-ink mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-lab-blue rounded-sm inline-block" />
              组分数据表
            </h3>
            <ComponentTable record={record} />
          </div>
        </div>
      </div>

      <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <h3 className="font-serif text-lg font-semibold text-lab-ink mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-lab-blue rounded-sm inline-block" />
          结论与备注
        </h3>
        <ConclusionSection conclusion={record.conclusion} manualRemark={record.manualRemark} />
      </div>

      <div className="flex flex-wrap gap-3 no-print animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <Link
          to={`/report/${record.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 font-medium bg-lab-blue text-white rounded hover:bg-blue-800 transition-colors shadow-sm"
        >
          <FileText width={16} height={16} />
          查看并导出报告
        </Link>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
        >
          <RotateCcw width={16} height={16} />
          重置补录内容
        </button>
      </div>
    </Layout>
  );
}
