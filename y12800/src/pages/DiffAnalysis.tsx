import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GitCompareArrows,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  XCircle,
  FileWarning,
} from 'lucide-react';
import { useQcStore } from '../store/qcStore';
import StatusBadge from '../components/StatusBadge';
import DuplicateBanner from '../components/DuplicateBanner';
import type { Sample } from '../../shared/types';

export default function DiffAnalysis() {
  const store = useQcStore();
  const [allSamples, setAllSamples] = useState<Sample[]>([]);
  const [anomalies, setAnomalies] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'anomalies' | 'all'>('anomalies');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/qc/diff-analysis');
        const json = await res.json();
        if (json.success) {
          setAllSamples(json.data.samples);
          setAnomalies(json.data.anomalies);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayList = viewMode === 'anomalies' ? anomalies : allSamples;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">差异分析</h2>
          <p className="text-xs text-slate-400 mt-0.5">质控结论 vs 来源材料 · 异常追溯</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('anomalies')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'anomalies' ? 'bg-qc-teal text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            仅异常项 ({anomalies.length})
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'all' ? 'bg-qc-teal text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            全部 ({allSamples.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-qc-amber" />
            <span className="text-xs font-medium text-slate-600">条码重复</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {allSamples.filter(s => s.isDuplicate).length}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">需回溯原始行号</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-rose-500" />
            <span className="text-xs font-medium text-slate-600">不可用记录</span>
          </div>
          <p className="text-2xl font-bold text-rose-600">
            {allSamples.filter(s => s.status === 'rejected').length}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">需重新采样</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileWarning size={16} className="text-orange-500" />
            <span className="text-xs font-medium text-slate-600">需复核</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {allSamples.filter(s => s.status === 'review_needed').length}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">退回生物老师</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-qc-teal" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-sm text-slate-600">暂无异常项</p>
          <p className="text-xs text-slate-400 mt-1">所有样本质控结论与来源材料一致</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-2.5">条码</th>
                <th className="px-4 py-2.5">行号</th>
                <th className="px-4 py-2.5">图片名</th>
                <th className="px-4 py-2.5">来源备注</th>
                <th className="px-4 py-2.5">状态</th>
                <th className="px-4 py-2.5">异常原因</th>
                <th className="px-4 py-2.5">追溯</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((sample) => (
                <tr key={sample.id} className={`table-row ${sample.isDuplicate ? 'duplicate-row' : ''}`}>
                  <td className="px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-1.5">
                      {sample.isDuplicate && <AlertTriangle size={12} className="text-qc-amber" />}
                      <span className="font-mono">{sample.barcode}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{sample.originalRowNumber}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[120px] truncate">
                    {sample.imageFileName || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[150px] truncate">
                    {sample.sourceRemark || '-'}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={sample.status} />
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {sample.isDuplicate && <span className="text-amber-700">条码重复</span>}
                    {sample.status === 'rejected' && (
                      <span className="text-rose-600 block">
                        {sample.reviewNote || '不可用'}
                      </span>
                    )}
                    {sample.status === 'review_needed' && (
                      <span className="text-orange-600 block">
                        {sample.reviewNote || '需复核'}
                      </span>
                    )}
                    {sample.qcConclusion && (
                      <span className="text-slate-500 block mt-0.5">{sample.qcConclusion}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/annotation/${sample.id}`}
                      className="text-xs text-qc-teal hover:underline flex items-center gap-0.5"
                    >
                      查看详情
                      <ArrowUpRight size={10} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
