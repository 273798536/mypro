import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, Clock, User, AlertTriangle } from "lucide-react";
import { useStore } from "@/store";
import type { ProcessingRecord } from "@/types";

function RecordsTable({ records, border }: { records: ProcessingRecord[]; border: string }) {
  if (records.length === 0)
    return <p className="text-sm text-stone-400 py-4 text-center">本批次暂无处理记录</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b ${border} text-stone-400`}>
            <th className="text-left py-2 pr-4 font-medium">时间</th>
            <th className="text-left py-2 pr-4 font-medium">操作</th>
            <th className="text-left py-2 pr-4 font-medium">操作人</th>
            <th className="text-left py-2 pr-4 font-medium">关联异常</th>
            <th className="text-left py-2 pr-4 font-medium">关联培养记录</th>
            <th className="text-left py-2 font-medium">原因</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-stone-50">
              <td className="py-2 pr-4 text-stone-500">{new Date(r.operated_at).toLocaleString("zh-CN")}</td>
              <td className="py-2 pr-4 text-stone-700">{r.action}</td>
              <td className="py-2 pr-4 text-stone-500">{r.operator}</td>
              <td className="py-2 pr-4">
                {r.anomaly_id ? <Link to={`/review/${r.anomaly_id}`} className="text-brand hover:underline">{r.anomaly_id.slice(0, 8)}</Link> : <span className="text-stone-300">—</span>}
              </td>
              <td className="py-2 pr-4">
                {r.culture_record_id ? <Link to={`/cultures/${r.culture_record_id}`} className="text-brand hover:underline">{r.culture_record_id.slice(0, 8)}</Link> : <span className="text-stone-300">—</span>}
              </td>
              <td className="py-2 text-stone-500">{r.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const { fetchBatches, batches, fetchReportPreview, reportPreview, fetchProcessingRecords, processingRecords, downloadReport, loading, error } = useStore();
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [curlOpen, setCurlOpen] = useState(false);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    if (batchId) { fetchReportPreview(batchId); fetchProcessingRecords(batchId); }
  };

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  if (loading && !reportPreview) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
        <div className="h-10 w-full bg-stone-200 rounded animate-pulse" />
        <div className="h-64 w-full bg-stone-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-brand-dark tracking-tight">报告导出</h1>
        <p className="text-sm text-stone-400 mt-1">预览并下载筛查报告，界面与报告共用同一批处理记录</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <label className="block text-sm font-medium text-stone-700">选择批次</label>
        <select value={selectedBatchId} onChange={(e) => handleBatchChange(e.target.value)} className="w-full max-w-md px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white">
          <option value="">— 请选择批次 —</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {selectedBatch && (
          <div className="grid grid-cols-5 gap-4 pt-2">
            {[
              ["批次名称", selectedBatch.name],
              ["运行时间", new Date(selectedBatch.run_at).toLocaleString("zh-CN")],
              ["总读段数", selectedBatch.total_reads.toLocaleString()],
              ["低质量读段", selectedBatch.low_quality_reads.toLocaleString()],
              ["异常数", String(selectedBatch.anomaly_count)],
            ].map(([label, value]) => (
              <div key={label} className="text-center p-3 bg-stone-50 rounded-lg">
                <p className="text-xs text-stone-400">{label}</p>
                <p className="text-sm font-medium text-stone-700 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {reportPreview && (
        <section className="max-w-3xl mx-auto">
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-brand-dark text-white px-8 py-3 flex items-center justify-between">
              <span className="text-sm font-medium">{reportPreview.batch.name}</span>
              <span className="text-xs opacity-70">生成时间：{new Date(reportPreview.generated_at).toLocaleString("zh-CN")}</span>
            </div>
            <div className="px-8 py-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2"><FileText size={16} />报告概要</h3>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    ["批次名称", reportPreview.batch.name],
                    ["运行时间", new Date(reportPreview.batch.run_at).toLocaleString("zh-CN")],
                    ["总读段数", reportPreview.batch.total_reads.toLocaleString()],
                    ["低质量数", reportPreview.batch.low_quality_reads.toLocaleString()],
                    ["异常数", String(reportPreview.batch.anomaly_count)],
                  ].map(([label, value]) => (
                    <div key={label}><p className="text-xs text-stone-400">{label}</p><p className="text-sm text-stone-700">{value}</p></div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2"><Clock size={16} />处理记录明细</h3>
                <RecordsTable records={reportPreview.processing_records} border="border-stone-100" />
              </div>
            </div>
          </div>
        </section>
      )}

      {selectedBatchId && (
        <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2"><User size={16} />处理记录（与界面共用）</h3>
          <RecordsTable records={processingRecords} border="border-stone-200" />
        </section>
      )}

      {selectedBatchId && (
        <div className="flex justify-center">
          <button onClick={() => downloadReport(selectedBatchId)} disabled={loading} className="btn-primary flex items-center gap-2 px-6 py-2.5">
            <Download size={16} />下载报告
          </button>
        </div>
      )}

      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-brand-dark">命令行示例</h3>
          <p className="text-xs text-stone-400 mt-0.5">同事可从空目录用以下命令复现流程</p>
        </div>
        <button onClick={() => setCurlOpen(!curlOpen)} className="text-xs text-brand hover:underline">{curlOpen ? "收起" : "展开"}</button>
        {curlOpen && (
          <pre className="bg-stone-900 text-stone-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
            <code>{`# 获取所有批次
curl http://localhost:3001/api/batches

# 获取特定批次读段
curl http://localhost:3001/api/batches/{batchId}/reads

# 获取低质量读段
curl http://localhost:3001/api/batches/{batchId}/reads?lowQuality=true

# 标记异常
curl -X POST http://localhost:3001/api/anomalies \\
  -H "Content-Type: application/json" \\
  -d '{"readId":"...","batchId":"...","createdBy":"张技师"}'

# 提交复核
curl -X POST http://localhost:3001/api/anomalies/{anomalyId}/review \\
  -H "Content-Type: application/json" \\
  -d '{"action":"approve","reason":"...","operator":"李导师"}'

# 下载报告
curl -O http://localhost:3001/api/reports/download/{batchId}`}</code>
          </pre>
        )}
      </section>
    </div>
  );
}
