import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { exportToCSV, downloadCSV } from '@/utils/export';
import { Download, FileCheck, FileX, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function ExportCenter() {
  const scoredSuppliers = useStore(s => s.scoredSuppliers);
  const suppliers = useStore(s => s.suppliers);
  const weights = useStore(s => s.weights);
  const notes = useStore(s => s.notes);
  const anomalies = useStore(s => s.anomalies);
  const consistencyReport = useStore(s => s.consistencyReport);
  const lastCalculatedWeights = useStore(s => s.lastCalculatedWeights);
  const runConsistency = useStore(s => s.runConsistency);

  const [autoVerify, setAutoVerify] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  const hasData = scoredSuppliers.length > 0;
  const canExport = hasData && consistencyReport !== null && consistencyReport.passed;

  const csvContent = useMemo(() => {
    if (!hasData) return '';
    return exportToCSV(scoredSuppliers, weights, notes, consistencyReport);
  }, [scoredSuppliers, weights, notes, consistencyReport, hasData]);

  const handleExport = () => {
    if (autoVerify) runConsistency();
    const csv = exportToCSV(scoredSuppliers, weights, notes, consistencyReport);
    downloadCSV(csv, `评分排序结果_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileCheck size={20} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">导出概览</h2>
        </div>
        {hasData ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <ShieldCheck size={18} />
              <span>已有评分数据，可以进行导出</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-slate-800">{suppliers.length}</p>
                <p className="text-xs text-slate-500">供应商数量</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-slate-800">{scoredSuppliers.filter(s => !s.eliminated).length}</p>
                <p className="text-xs text-slate-500">已评分结果</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-600">{anomalies.length}</p>
                <p className="text-xs text-slate-500">异常项</p>
              </div>
            </div>
            {lastCalculatedWeights && (
              <p className="text-xs text-slate-400">
                上次计算时间：权重已更新（权重总和 {Object.values(lastCalculatedWeights).reduce((a, b) => a + b, 0)}%）
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <FileX size={18} />
            <span>暂无评分数据，请先完成评分计算</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={20} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">一致性校验状态</h2>
        </div>
        {consistencyReport ? (
          consistencyReport.passed ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <ShieldCheck size={28} className="text-emerald-500 shrink-0" />
              <span className="text-emerald-700 font-medium">所有校验项通过，可以安全导出</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <AlertTriangle size={28} className="text-red-500 shrink-0" />
                <span className="text-red-700 font-medium">存在未通过校验项，无法导出</span>
              </div>
              {consistencyReport.checks.filter(c => !c.passed).map((check, i) => (
                <div key={i} className="bg-red-50 border-l-4 border-red-400 rounded-r-lg p-3 text-sm">
                  <p className="font-medium text-red-700">{check.name}</p>
                  <p className="text-red-600 mt-1">{check.detail}</p>
                </div>
              ))}
              <p className="text-sm text-slate-500">请修正以下问题后重新校验</p>
            </div>
          )
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
            <p>请先在溯源与审计页面执行一致性校验</p>
            <Link to="/audit" className="underline font-medium mt-1 inline-block">前往溯源与审计 →</Link>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Download size={20} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">导出操作</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExport}
            disabled={!canExport}
            className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            导出 CSV 文件
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoVerify}
              onChange={e => setAutoVerify(e.target.checked)}
              className="rounded border-slate-300"
            />
            导出前自动校验
          </label>
        </div>
        {hasData && (
          <div>
            <button
              onClick={() => setPreviewOpen(!previewOpen)}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              {previewOpen ? '收起结构预览' : '展开结构预览'}
            </button>
            {previewOpen && (
              <div className="mt-2 bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-600 overflow-auto max-h-32">
                {csvContent.split('\n').slice(0, 10).map((line, i) => (
                  <div key={i}>{line || '\u00A0'}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileCheck size={20} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">导出内容预览</h2>
        </div>
        {csvContent ? (
          <textarea
            readOnly
            value={csvContent}
            className="w-full bg-slate-50 font-mono text-xs text-slate-700 border border-slate-200 rounded-lg p-3 resize-none max-h-64 overflow-auto focus:outline-none"
          />
        ) : (
          <p className="text-sm text-slate-400">暂无数据可预览</p>
        )}
      </div>
    </div>
  );
}
