import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronRight,
  Link2,
  Calendar,
  User,
  Filter,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useEthicsStore, useFirstVisitExperience } from '../store/useEthicsStore';
import { StatusBadge, ConclusionBadge } from '../components/StatusBadge';
import TraceAnchor from '../components/TraceAnchor';
import DemoDataGuide from '../components/DemoDataGuide';
import { exportSupervisorReport } from '../utils/export';
import type { SampleStatus, Sample } from '../types';

export default function SupervisorReport() {
  useFirstVisitExperience();

  const samples = useEthicsStore((s) => s.samples);
  const reviewRounds = useEthicsStore((s) => s.reviewRounds);
  const reviewOpinions = useEthicsStore((s) => s.reviewOpinions);
  const finalConclusions = useEthicsStore((s) => s.finalConclusions);
  const getReviewRoundsBySampleId = useEthicsStore((s) => s.getReviewRoundsBySampleId);
  const getReviewOpinionByRoundId = useEthicsStore((s) => s.getReviewOpinionByRoundId);
  const getFinalConclusionByRoundId = useEthicsStore((s) => s.getFinalConclusionByRoundId);
  const setHighlightedElement = useEthicsStore((s) => s.setHighlightedElement);
  const currentUser = useEthicsStore((s) => s.currentUser);
  const currentReviewBatch = useEthicsStore((s) => s.currentReviewBatch);
  const setCurrentReviewBatch = useEthicsStore((s) => s.setCurrentReviewBatch);
  const updateSampleStatus = useEthicsStore((s) => s.updateSampleStatus);
  const activeFilters = useEthicsStore((s) => s.activeFilters);
  const setFilters = useEthicsStore((s) => s.setFilters);
  const resetFilters = useEthicsStore((s) => s.resetFilters);

  const [expandedSampleId, setExpandedSampleId] = useState<string | null>(null);
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(new Set());

  const batchNumbers = useMemo(
    () => Array.from(new Set(samples.map((s) => s.batchNumber))),
    [samples]
  );

  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      if (currentReviewBatch && sample.batchNumber !== currentReviewBatch) return false;
      if (activeFilters.status && sample.status !== activeFilters.status) return false;
      return true;
    });
  }, [samples, currentReviewBatch, activeFilters.status]);

  const stats = useMemo(() => {
    const total = filteredSamples.length;
    const approved = filteredSamples.filter((s) => s.status === 'approved').length;
    const rejected = filteredSamples.filter((s) => s.status === 'rejected').length;
    const reviewing = filteredSamples.filter((s) => s.status === 'reviewing').length;
    const pending = filteredSamples.filter((s) => s.status === 'pending').length;
    const passRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, rejected, reviewing, pending, passRate };
  }, [filteredSamples]);

  const toggleExpand = (sampleId: string) => {
    setExpandedSampleId((prev) => (prev === sampleId ? null : sampleId));
  };

  const toggleSelect = (sampleId: string) => {
    setSelectedSamples((prev) => {
      const next = new Set(prev);
      if (next.has(sampleId)) {
        next.delete(sampleId);
      } else {
        next.add(sampleId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedSamples.size === filteredSamples.length) {
      setSelectedSamples(new Set());
    } else {
      setSelectedSamples(new Set(filteredSamples.map((s) => s.id)));
    }
  };

  const scrollToTrace = (elementId: string) => {
    setHighlightedElement(elementId);
    setTimeout(() => setHighlightedElement(null), 1500);
  };

  const handleBatchApprove = () => {
    if (selectedSamples.size === 0) {
      alert('请先选择样本');
      return;
    }
    if (confirm(`确定批量通过 ${selectedSamples.size} 个样本？`)) {
      selectedSamples.forEach((id) => updateSampleStatus(id, 'approved'));
      setSelectedSamples(new Set());
      alert('批量操作完成');
    }
  };

  const handleBatchReject = () => {
    if (selectedSamples.size === 0) {
      alert('请先选择样本');
      return;
    }
    if (confirm(`确定批量驳回 ${selectedSamples.size} 个样本？`)) {
      selectedSamples.forEach((id) => updateSampleStatus(id, 'rejected'));
      setSelectedSamples(new Set());
      alert('批量操作完成');
    }
  };

  const handleExportReport = () => {
    const batch = currentReviewBatch || 'ALL';
    const relatedOpinions = reviewOpinions.filter((op) => {
      const round = reviewRounds.find((r) => r.id === op.reviewRoundId);
      return round && filteredSamples.some((s) => s.id === round.sampleId);
    });
    const relatedConclusions = finalConclusions.filter((fc) => {
      const round = reviewRounds.find((r) => r.id === fc.reviewRoundId);
      return round && filteredSamples.some((s) => s.id === round.sampleId);
    });
    exportSupervisorReport(filteredSamples, relatedOpinions, relatedConclusions, batch);
  };

  const getLatestConclusion = (sample: Sample) => {
    const rounds = getReviewRoundsBySampleId(sample.id);
    if (rounds.length === 0) return null;
    const latestRound = rounds[rounds.length - 1];
    return getFinalConclusionByRoundId(latestRound.id);
  };

  const getLatestOpinion = (sample: Sample) => {
    const rounds = getReviewRoundsBySampleId(sample.id);
    if (rounds.length === 0) return null;
    const latestRound = rounds[rounds.length - 1];
    return getReviewOpinionByRoundId(latestRound.id);
  };

  return (
    <div className="space-y-6">
      <DemoDataGuide />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">导师报告</h2>
          <p className="text-gray-500 text-sm">
            汇总报告 · 追溯链路 · 原始记录锚点 · 批量操作
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出导师报告
          </button>
        </div>
      </div>

      {currentUser.role !== 'supervisor' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">
              当前以生物老师身份查看，请在右上角切换为导师角色以获得完整权限
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">筛选条件</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">复核批次</label>
            <select
              value={currentReviewBatch || ''}
              onChange={(e) => setCurrentReviewBatch(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">全部批次</option>
              {batchNumbers.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">状态</label>
            <select
              value={activeFilters.status || ''}
              onChange={(e) =>
                setFilters({ status: (e.target.value as SampleStatus) || undefined })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">全部状态</option>
              <option value="approved">已通过</option>
              <option value="rejected">已驳回</option>
              <option value="reviewing">复核中</option>
              <option value="pending">待核对</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重置
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary-100 text-sm">当前批次</p>
            <h3 className="text-2xl font-serif font-bold">
              {currentReviewBatch || '全部批次'}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold font-serif">{stats.passRate}%</p>
            <p className="text-primary-200 text-sm">通过率</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-primary-200">样本总数</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-emerald-200">{stats.approved}</p>
            <p className="text-xs text-primary-200">已通过</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-rose-200">{stats.rejected}</p>
            <p className="text-xs text-primary-200">已驳回</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-amber-200">{stats.reviewing + stats.pending}</p>
            <p className="text-xs text-primary-200">待处理</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">复核结论列表</h3>
            {selectedSamples.size > 0 && (
              <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                已选择 {selectedSamples.size} 项
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-gray-500 hover:text-primary-600"
            >
              {selectedSamples.size === filteredSamples.length ? '取消全选' : '全选'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-zebra">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedSamples.size === filteredSamples.length && filteredSamples.length > 0}
                    onChange={selectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  样本条码
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  采样地点
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  追溯锚点
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最新结论
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSamples.map((sample) => {
                const conclusion = getLatestConclusion(sample);
                const opinion = getLatestOpinion(sample);
                const isExpanded = expandedSampleId === sample.id;
                const isSelected = selectedSamples.has(sample.id);

                return (
                  <>
                    <tr
                      key={sample.id}
                      className={`transition-colors ${isExpanded ? 'bg-primary-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(sample.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-900">{sample.barcode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{sample.samplingLocation}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <TraceAnchor
                            type="row"
                            value={sample.originalRowNumber}
                            sampleId={sample.id}
                            onClick={() => scrollToTrace(`trace-row-${sample.id}`)}
                          />
                          <TraceAnchor
                            type="image"
                            value={sample.imageName}
                            sampleId={sample.id}
                            onClick={() => scrollToTrace(`trace-image-${sample.id}`)}
                          />
                          <TraceAnchor
                            type="source"
                            value={sample.sourceNote}
                            sampleId={sample.id}
                            onClick={() => scrollToTrace(`trace-source-${sample.id}`)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {conclusion ? (
                          <ConclusionBadge result={conclusion.result} />
                        ) : (
                          <span className="text-xs text-gray-400">暂无结论</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sample.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleExpand(sample.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                收起
                              </>
                            ) : (
                              <>
                                <ChevronRight className="w-3 h-3" />
                                展开详情
                              </>
                            )}
                          </button>
                          <Link
                            to={`/ethics-review/${sample.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            查看
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-8 py-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-white rounded-lg border border-gray-100 p-4">
                                <p className="text-xs font-medium text-gray-500 mb-2">复核意见</p>
                                {opinion ? (
                                  <>
                                    <p className="text-sm text-gray-800 mb-2">{opinion.content}</p>
                                    {opinion.missingTimePoints.length > 0 && (
                                      <p className="text-xs text-rose-600">
                                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                                        缺失时间点：{opinion.missingTimePoints.join(', ')}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2">
                                      <Clock className="w-3 h-3 inline mr-1" />
                                      {new Date(opinion.createdAt).toLocaleString('zh-CN')}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-400">暂无复核意见</p>
                                )}
                              </div>
                              <div className="bg-white rounded-lg border border-gray-100 p-4">
                                <p className="text-xs font-medium text-gray-500 mb-2">最终结论</p>
                                {conclusion ? (
                                  <>
                                    <div className="mb-2">
                                      <ConclusionBadge result={conclusion.result} />
                                    </div>
                                    {conclusion.linkedCultureRecordId && (
                                      <button
                                        onClick={() =>
                                          scrollToTrace(
                                            `culture-record-${conclusion.linkedCultureRecordId}`
                                          )
                                        }
                                        className="text-xs text-primary-600 hover:text-primary-700"
                                      >
                                        <Link2 className="w-3 h-3 inline mr-1" />
                                        查看关联培养记录 →
                                      </button>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2">
                                      <Clock className="w-3 h-3 inline mr-1" />
                                      {new Date(conclusion.createdAt).toLocaleString('zh-CN')}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-400">暂无最终结论</p>
                                )}
                              </div>
                              <div className="bg-white rounded-lg border border-gray-100 p-4">
                                <p className="text-xs font-medium text-gray-500 mb-2">追溯信息</p>
                                <div className="space-y-2">
                                  <div
                                    id={`trace-row-${sample.id}`}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">原始行号：</span>
                                    <span className="font-mono text-gray-800">
                                      {sample.originalRowNumber}
                                    </span>
                                  </div>
                                  <div
                                    id={`trace-image-${sample.id}`}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">图片名：</span>
                                    <span className="font-mono text-gray-800">
                                      {sample.imageName}
                                    </span>
                                  </div>
                                  <div
                                    id={`trace-source-${sample.id}`}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">来源：</span>
                                    <span className="text-gray-800">{sample.sourceNote}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSamples.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 px-6 py-4 flex items-center gap-6 z-50">
          <div className="text-sm">
            <span className="text-gray-500">已选择</span>
            <span className="font-semibold text-gray-800 mx-2">{selectedSamples.size}</span>
            <span className="text-gray-500">个样本</span>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <button
            onClick={handleBatchApprove}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            批量通过
          </button>
          <button
            onClick={handleBatchReject}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            批量驳回
          </button>
          <button
            onClick={() => setSelectedSamples(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            取消选择
          </button>
        </div>
      )}
    </div>
  );
}
