import { FileText, Handshake, Calendar, User, Paperclip, AlertTriangle } from "lucide-react";
import { useTopologyStore } from "../store/topologyStore";

export default function BatchHeader() {
  const { batchInfo } = useTopologyStore();
  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50 rounded-2xl p-6 shadow-sm border border-slate-700/60">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Handshake className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">拓扑路径课堂验算</h1>
              <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200">
                {batchInfo.batchId}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {batchInfo.submittedBy}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {batchInfo.createdAt}
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <Paperclip className="h-3.5 w-3.5" />
                晚到附件 {batchInfo.lateAttachments.length} 份
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 text-slate-300 text-xs max-w-md">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-slate-200 text-sm">
              本批共 {useTopologyStore.getState().records.length} 条记录进入复核。
            </p>
            <p className="text-slate-400 mt-1">
              看板所有统计、明细、导出均基于同一批计算结果，无需再翻聊天记录。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-200 mb-2">
            <FileText className="h-4 w-4" /> 现场交接说明（小孟补录）
          </div>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {batchInfo.handoverNote}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-200 mb-2">
            <FileText className="h-4 w-4" /> 补充说明（单位/操作留痕）
          </div>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {batchInfo.supplementNotes}
          </p>
          <div className="mt-3 space-y-1.5">
            {batchInfo.lateAttachments.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2 text-xs rounded-lg bg-amber-500/10 border border-amber-400/20 p-2"
              >
                <Paperclip className="h-3.5 w-3.5 text-amber-300 mt-0.5" />
                <div>
                  <div className="text-amber-200">{a.name}</div>
                  <div className="text-slate-400">
                    {a.receivedAt} · {a.note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
