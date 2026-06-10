import { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Loader2,
  FileDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import type { QCReport } from '../../shared/types';

export default function Reports() {
  const [reports, setReports] = useState<QCReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qc/reports');
      const json = await res.json();
      if (json.success) setReports(json.data);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/qc/reports/generate', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchReports();
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">报告中心</h2>
          <p className="text-xs text-slate-400 mt-0.5">质控报告导出 · 处理历史查询</p>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary">
          {generating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          {generating ? '生成中...' : '生成质控报告'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-qc-teal" />
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600">暂无质控报告</p>
          <p className="text-xs text-slate-400 mt-1">点击"生成质控报告"创建首份报告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-qc-teal" />
                    <span className="text-sm font-medium text-slate-800">
                      质控报告
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {report.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={12} />
                    {new Date(report.generatedAt).toLocaleString()}
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">总计:</span>
                      <span className="font-semibold">{report.totalSamples}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      <span className="text-emerald-700 font-medium">{report.completedCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-amber-500" />
                      <span className="text-amber-700 font-medium">{report.reviewNeededCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle size={12} className="text-rose-500" />
                      <span className="text-rose-700 font-medium">{report.rejectedCount}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`/api/qc/reports/${report.id}/download`}
                  className="btn-secondary btn-sm"
                >
                  <Download size={14} />
                  下载
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
