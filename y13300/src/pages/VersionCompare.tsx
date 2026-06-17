import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare, Plus, Minus, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore.js';
import { cn } from '@/lib/utils.js';
import EvidenceTable from '@/components/EvidenceTable.js';

export default function VersionCompare() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { versions, diffResult, loading, error, fetchVersions, compareVersions, clearDiff, setError } = useTicketStore();

  const [v1, setV1] = useState<number>(1);
  const [v2, setV2] = useState<number>(1);

  useEffect(() => {
    if (id) {
      fetchVersions(id);
    }
    return () => {
      clearDiff();
      setError(null);
    };
  }, [id, fetchVersions, clearDiff, setError]);

  useEffect(() => {
    if (versions.length >= 2) {
      setV1(versions[versions.length - 2].version);
      setV2(versions[versions.length - 1].version);
    } else if (versions.length === 1) {
      setV1(versions[0].version);
      setV2(versions[0].version);
    }
  }, [versions]);

  useEffect(() => {
    if (id && v1 && v2 && v1 !== v2) {
      compareVersions(id, v1, v2);
    }
  }, [id, v1, v2, compareVersions]);

  const handleCompare = () => {
    if (id && v1 && v2) {
      compareVersions(id, v1, v2);
    }
  };

  if (loading && versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/ticket/${id}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回工单详情
          </button>
          <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <GitCompare className="w-6 h-6 text-blue-600" />
            版本对比
          </h1>
          <p className="text-slate-500">对比两个版本之间的证据差异</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">基准版本</label>
              <select
                value={v1}
                onChange={(e) => setV1(Number(e.target.value))}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-32"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.version}>
                    v{v.version}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-slate-400 pb-2">→</div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">对比版本</label>
              <select
                value={v2}
                onChange={(e) => setV2(Number(e.target.value))}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-32"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.version}>
                    v{v.version}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompare}
              disabled={v1 === v2}
              className={cn(
                'px-6 py-2 rounded-lg text-sm font-medium transition-colors',
                v1 === v2
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              开始对比
            </button>
          </div>
        </div>

        {diffResult && v1 !== v2 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">新增</p>
                    <p className="text-2xl font-bold text-emerald-600 font-mono">{diffResult.summary.addedCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Minus className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">删除</p>
                    <p className="text-2xl font-bold text-red-600 font-mono">{diffResult.summary.removedCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">修改</p>
                    <p className="text-2xl font-bold text-amber-600 font-mono">{diffResult.summary.modifiedCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-600 font-mono font-bold">=</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">未变</p>
                    <p className="text-2xl font-bold text-slate-600 font-mono">{diffResult.summary.unchangedCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">基准版本 v{v1}</h3>
                  <span className="text-xs text-slate-500">
                    共 {diffResult.added.length + diffResult.removed.length + diffResult.modified.length + diffResult.unchanged.length} 条
                  </span>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Minus className="w-4 h-4 text-red-500" />
                      已删除 ({diffResult.removed.length})
                    </h4>
                    {diffResult.removed.length > 0 && (
                      <EvidenceTable evidences={diffResult.removed} diffType="removed" showDiffIcons />
                    )}
                  </div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      已修改 ({diffResult.modified.length})
                    </h4>
                    {diffResult.modified.length > 0 && (
                      <EvidenceTable evidences={diffResult.modified} diffType="modified" showDiffIcons />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      未变更 ({diffResult.unchanged.length})
                    </h4>
                    {diffResult.unchanged.length > 0 && (
                      <EvidenceTable evidences={diffResult.unchanged} diffType="unchanged" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">对比版本 v{v2}</h3>
                  <span className="text-xs text-slate-500">
                    共 {diffResult.added.length + diffResult.modified.length + diffResult.unchanged.length} 条
                  </span>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-500" />
                      已新增 ({diffResult.added.length})
                    </h4>
                    {diffResult.added.length > 0 && (
                      <EvidenceTable evidences={diffResult.added} diffType="added" showDiffIcons />
                    )}
                  </div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      已修改 ({diffResult.modified.length})
                    </h4>
                    {diffResult.modified.length > 0 && (
                      <EvidenceTable evidences={diffResult.modified} diffType="modified" showDiffIcons />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      未变更 ({diffResult.unchanged.length})
                    </h4>
                    {diffResult.unchanged.length > 0 && (
                      <EvidenceTable evidences={diffResult.unchanged} diffType="unchanged" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {v1 === v2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <GitCompare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">请选择两个不同的版本进行对比</p>
          </div>
        )}
      </div>
    </div>
  );
}
