import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ResultBadge } from '@/components/ResultCard';
import { ResultCard as ResultCardView } from '@/components/ResultCard';
import { buildExportSummary, exportToCSV, downloadCSV, exportToPDF } from '@/utils/export';
import type { ResultStatus } from '@/types';
import {
  BarChart3, CheckCircle, AlertTriangle, XCircle,
  Download, Filter, Eye, ArrowUpRight,
} from 'lucide-react';

function ResultsPage() {
  const {
    results,
    experiments,
    reagents,
    batches,
    initializeWithMock,
    getExperimentById,
    getReagentById,
    getBatchById,
  } = useAppStore();

  const [filter, setFilter] = useState<ResultStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  initializeWithMock();

  const stats = useMemo(() => ({
    total: results.length,
    pass: results.filter((r) => r.status === 'PASS').length,
    review: results.filter((r) => r.status === 'REVIEW').length,
    fail: results.filter((r) => r.status === 'FAIL').length,
  }), [results]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return results;
    return results.filter((r) => r.status === filter);
  }, [results, filter]);

  const selectedResult = selectedId ? results.find((r) => r.id === selectedId) : null;
  const selectedExp = selectedResult ? getExperimentById(selectedResult.experimentId) : null;
  const selectedReagent = selectedExp?.reagentId ? getReagentById(selectedExp.reagentId) : undefined;
  const selectedBatch = selectedExp?.batchId ? getBatchById(selectedExp.batchId) : undefined;

  const handleExportAllCSV = () => {
    const summaries = results.map((r) => {
      const exp = getExperimentById(r.experimentId);
      const reg = exp?.reagentId ? getReagentById(exp.reagentId) : undefined;
      const bat = exp?.batchId ? getBatchById(exp.batchId) : undefined;
      return buildExportSummary(r, exp, reg, bat);
    });
    const csv = exportToCSV(summaries);
    downloadCSV(`晶体水含量结果汇总_${new Date().toLocaleDateString()}.csv`, csv);
  };

  const handleExportSelectedPDF = async () => {
    if (!selectedResult) return;
    try {
      await exportToPDF('selected-result-export', `晶体水含量报告_${selectedExp?.sampleNo || selectedResult.id}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF 导出失败');
    }
  };

  const summaryForStatus = (s: ResultStatus) =>
    results.filter((r) => r.status === s).slice(0, 3).map((r) => {
      const exp = getExperimentById(r.experimentId);
      return {
        id: r.id,
        sampleNo: exp?.sampleNo || '—',
        value: r.waterContent,
        source: r.sourceTrace,
      };
    });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">总结果数</p>
              <p className="text-3xl font-serif font-bold text-slate-800 mt-1">{stats.total}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
              <BarChart3 className="w-5.5 h-5.5 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="card p-5 border-status-pass/20 bg-gradient-to-br from-status-passBg/50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-status-pass/70 font-medium uppercase tracking-wider">可直接使用</p>
              <p className="text-3xl font-serif font-bold text-status-pass mt-1">{stats.pass}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-status-pass/10 flex items-center justify-center">
              <CheckCircle className="w-5.5 h-5.5 text-status-pass" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {summaryForStatus('PASS').map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="w-full text-left text-xs text-slate-500 hover:text-status-pass flex items-center justify-between group"
              >
                <span>{s.sampleNo}：{s.value.toFixed(2)}%</span>
                <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5 border-status-review/20 bg-gradient-to-br from-status-reviewBg/50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-status-review/70 font-medium uppercase tracking-wider">需管理员复核</p>
              <p className="text-3xl font-serif font-bold text-status-review mt-1">{stats.review}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-status-review/10 flex items-center justify-center">
              <AlertTriangle className="w-5.5 h-5.5 text-status-review" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {summaryForStatus('REVIEW').map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="w-full text-left text-xs text-slate-500 hover:text-status-review flex items-center justify-between group"
              >
                <span className="truncate">{s.sampleNo}：{s.value.toFixed(2)}%</span>
                <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5 border-status-fail/20 bg-gradient-to-br from-status-failBg/50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-status-fail/70 font-medium uppercase tracking-wider">计算失败</p>
              <p className="text-3xl font-serif font-bold text-status-fail mt-1">{stats.fail}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-status-fail/10 flex items-center justify-center">
              <XCircle className="w-5.5 h-5.5 text-status-fail" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {summaryForStatus('FAIL').map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="w-full text-left text-xs text-slate-500 hover:text-status-fail flex items-center justify-between group"
              >
                <span>{s.sampleNo}：{s.value.toFixed(2)}%</span>
                <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 space-y-4">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <div className="flex gap-1">
                  {(['ALL', 'PASS', 'REVIEW', 'FAIL'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filter === f
                          ? 'bg-primary-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f === 'ALL' ? '全部' : f === 'PASS' ? '通过' : f === 'REVIEW' ? '复核' : '失败'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="btn-secondary text-sm py-2 flex items-center gap-1.5"
                onClick={handleExportAllCSV}
              >
                <Download className="w-4 h-4" />
                导出全部 CSV
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_rgb(226,232,240)] z-10">
                  <tr>
                    <th className="table-th">样品编号</th>
                    <th className="table-th">批次</th>
                    <th className="table-th">试剂</th>
                    <th className="table-th">水含量</th>
                    <th className="table-th">状态</th>
                    <th className="table-th">空白降级</th>
                    <th className="table-th">计算时间</th>
                    <th className="table-th">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const exp = getExperimentById(r.experimentId);
                    const reg = exp?.reagentId ? getReagentById(exp.reagentId) : undefined;
                    const bat = exp?.batchId ? getBatchById(exp.batchId) : undefined;
                    const isSelected = selectedId === r.id;
                    return (
                      <tr
                        key={r.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50/60'
                        }`}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <td className="table-td font-medium">{exp?.sampleNo || '—'}</td>
                        <td className="table-td text-xs text-slate-500">{bat?.batchNo || '—'}</td>
                        <td className="table-td text-xs text-slate-500">{reg?.name || '—'}</td>
                        <td className="table-td font-mono font-semibold text-slate-800">
                          {r.waterContent.toFixed(4)}{r.unit}
                        </td>
                        <td className="table-td">
                          <ResultBadge status={r.status} size="sm" />
                        </td>
                        <td className="table-td">
                          {r.blankFallback ? (
                            <span className="text-status-review text-xs font-medium">
                              是（{r.blankFallbackValue?.toFixed(4)}g）
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">否</span>
                          )}
                        </td>
                        <td className="table-td text-xs text-slate-400">
                          {new Date(r.calculatedAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="table-td">
                          <button
                            className="text-primary-600 hover:text-primary-800 text-xs font-medium inline-flex items-center gap-1"
                            onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}
                          >
                            查看
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <p className="text-sm text-slate-400">暂无符合条件的计算结果</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          {selectedResult ? (
            <div className="sticky top-0" id="selected-result-export">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">详情预览</p>
                <button
                  className="btn-primary text-sm py-2 flex items-center gap-1.5"
                  onClick={handleExportSelectedPDF}
                >
                  <Download className="w-4 h-4" />
                  导出 PDF
                </button>
              </div>
              <ResultCardView
                status={selectedResult.status}
                waterContent={selectedResult.waterContent}
                unit={selectedResult.unit}
                formula={selectedResult.formula}
                formulaDetail={selectedResult.formulaDetail}
                sourceTrace={selectedResult.sourceTrace}
                safetyTip={selectedResult.safetyTip}
                failureReason={selectedResult.failureReason}
                retestAdvice={selectedResult.retestAdvice}
                blankFallback={selectedResult.blankFallback}
                blankFallbackValue={selectedResult.blankFallbackValue}
                applicableRange={selectedResult.applicableRange}
                calculatedAt={selectedResult.calculatedAt}
                parallelDeviation={selectedResult.parallelDeviation}
                onExport={handleExportSelectedPDF}
              />
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="font-serif text-base font-semibold text-slate-600">选择一条记录查看详情</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                点击左侧表格中的任意一行，在此查看完整的计算过程、安全提示与复测建议
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
