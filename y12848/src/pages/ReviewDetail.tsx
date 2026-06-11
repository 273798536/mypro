import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Link2,
  Send,
  FileText,
  Image,
  FileCode,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useEthicsStore, useFirstVisitExperience } from '../store/useEthicsStore';
import { StatusBadge, ConclusionBadge } from '../components/StatusBadge';
import TraceAnchor from '../components/TraceAnchor';
import type { CultureRecord, ConclusionResult } from '../types';

export default function ReviewDetail() {
  useFirstVisitExperience();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const getSampleById = useEthicsStore((s) => s.getSampleById);
  const getCultureRecordsBySampleId = useEthicsStore((s) => s.getCultureRecordsBySampleId);
  const getReviewRoundsBySampleId = useEthicsStore((s) => s.getReviewRoundsBySampleId);
  const getReviewOpinionByRoundId = useEthicsStore((s) => s.getReviewOpinionByRoundId);
  const getFinalConclusionByRoundId = useEthicsStore((s) => s.getFinalConclusionByRoundId);
  const getDuplicatesBySampleId = useEthicsStore((s) => s.getDuplicatesBySampleId);
  const submitReviewRound = useEthicsStore((s) => s.submitReviewRound);
  const setHighlightedElement = useEthicsStore((s) => s.setHighlightedElement);
  const highlightedElementId = useEthicsStore((s) => s.highlightedElementId);
  const currentUser = useEthicsStore((s) => s.currentUser);

  const sample = id ? getSampleById(id) : undefined;
  const cultureRecords = id ? getCultureRecordsBySampleId(id) : [];
  const reviewRounds = id ? getReviewRoundsBySampleId(id) : [];
  const duplicates = id ? getDuplicatesBySampleId(id) : [];

  const [opinionContent, setOpinionContent] = useState('');
  const [conclusionResult, setConclusionResult] = useState<ConclusionResult>('pending');
  const [linkedRecordId, setLinkedRecordId] = useState<string | null>(null);
  const [missingTimePoints, setMissingTimePoints] = useState<string[]>([]);
  const [cultureRecordUpdates, setCultureRecordUpdates] = useState<
    { id: string; isMissing: boolean }[]
  >([]);

  const latestRound = reviewRounds.length > 0 ? reviewRounds[reviewRounds.length - 1] : null;
  const latestOpinion = latestRound ? getReviewOpinionByRoundId(latestRound.id) : undefined;
  const latestConclusion = latestRound ? getFinalConclusionByRoundId(latestRound.id) : undefined;

  const handleToggleMissing = (record: CultureRecord) => {
    setMissingTimePoints((prev) =>
      prev.includes(record.timePoint)
        ? prev.filter((t) => t !== record.timePoint)
        : [...prev, record.timePoint]
    );
    setCultureRecordUpdates((prev) => {
      const existing = prev.find((u) => u.id === record.id);
      if (existing) {
        return prev.map((u) => (u.id === record.id ? { ...u, isMissing: !u.isMissing } : u));
      }
      return [...prev, { id: record.id, isMissing: !record.isMissing }];
    });
  };

  const handleLinkConclusion = (recordId: string) => {
    setLinkedRecordId((prev) => (prev === recordId ? null : recordId));
  };

  const scrollToRecord = (recordId: string) => {
    const element = document.getElementById(`culture-record-${recordId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedElement(`culture-record-${recordId}`);
      setTimeout(() => setHighlightedElement(null), 1500);
    }
  };

  const handleSubmit = () => {
    if (!id || !opinionContent.trim()) {
      alert('请填写复核意见');
      return;
    }

    submitReviewRound({
      sampleId: id,
      opinionContent: opinionContent.trim(),
      missingTimePoints,
      conclusionResult,
      linkedCultureRecordId: linkedRecordId,
      cultureRecordUpdates,
    });

    alert('复核已提交！');
    setOpinionContent('');
    setConclusionResult('pending');
    setLinkedRecordId(null);
    setMissingTimePoints([]);
    setCultureRecordUpdates([]);
  };

  if (!sample) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">样本不存在</p>
        <Link to="/ethics-review" className="text-primary-600 hover:underline mt-2 inline-block">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-serif font-bold text-gray-800">复核详情</h2>
          <p className="text-gray-500 text-sm">
            培养记录与最终结论可双向跳转 · 复核意见、培养记录、时间点缺失整合在同一轮
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 font-mono">{sample.barcode}</h3>
                  <StatusBadge status={sample.status} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-400 mr-2">采样地点：</span>
                    {sample.samplingLocation}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-400 mr-2">批次号：</span>
                    {sample.batchNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-400 mr-2">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      更新时间：
                    </span>
                    {new Date(sample.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-2">追溯锚点</p>
                <div className="flex flex-col gap-1.5">
                  <TraceAnchor type="row" value={sample.originalRowNumber} sampleId={sample.id} />
                  <TraceAnchor type="image" value={sample.imageName} sampleId={sample.id} />
                  <TraceAnchor type="source" value={sample.sourceNote} sampleId={sample.id} />
                </div>
              </div>
            </div>

            {duplicates.length > 0 && duplicates.some((d) => d.resolution === 'pending') && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    该样本存在重复记录，请在列表页处理后再复核
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">培养记录时间线</h3>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                  <span>标记为缺失</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span>已关联结论</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span>当前选中</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gray-200"></div>

              {cultureRecords.map((record, index) => {
                const isMissing =
                  missingTimePoints.includes(record.timePoint) || record.isMissing;
                const isLinked = record.linkedConclusionId === latestConclusion?.id;
                const isSelected = linkedRecordId === record.id;
                const isHighlighted = highlightedElementId === `culture-record-${record.id}`;

                return (
                  <div
                    key={record.id}
                    id={`culture-record-${record.id}`}
                    className={`relative pl-16 pb-6 last:pb-0 transition-all ${
                      isHighlighted ? 'animate-highlight rounded-lg -mx-4 px-4' : ''
                    }`}
                  >
                    <div
                      className={`absolute left-4 w-5 h-5 rounded-full border-4 transition-all ${
                        isMissing
                          ? 'bg-white border-rose-500'
                          : isLinked
                          ? 'bg-primary-500 border-primary-200'
                          : isSelected
                          ? 'bg-emerald-500 border-emerald-200'
                          : 'bg-white border-gray-300'
                      }`}
                    ></div>

                    <div
                      className={`rounded-xl border p-4 transition-all ${
                        isMissing
                          ? 'border-rose-200 bg-rose-50'
                          : isLinked
                          ? 'border-primary-200 bg-primary-50'
                          : isSelected
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-semibold ${
                              isMissing ? 'text-rose-700' : 'text-gray-800'
                            }`}
                          >
                            {record.timePoint}
                          </span>
                          {isMissing && (
                            <span className="text-xs text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                              时间点缺失
                            </span>
                          )}
                          {isLinked && latestConclusion && (
                            <button
                              onClick={() => scrollToRecord('conclusion-section')}
                              className="inline-flex items-center gap-1 text-xs text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full hover:bg-primary-200 transition-colors"
                            >
                              <Link2 className="w-3 h-3" />
                              已关联结论 →
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {record.operator}
                          <span className="text-gray-300">|</span>
                          <Calendar className="w-3 h-3" />
                          {new Date(record.recordDate).toLocaleDateString('zh-CN')}
                        </div>
                      </div>

                      {isMissing ? (
                        <p className="text-sm text-rose-600 italic">
                          该时间点培养记录缺失，请补录后再复核
                        </p>
                      ) : (
                        <p className="text-sm text-gray-700">{record.content}</p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <button
                          onClick={() => handleToggleMissing(record)}
                          className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                            isMissing
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {isMissing ? '取消缺失标记' : '标记为缺失'}
                        </button>
                        <button
                          onClick={() => handleLinkConclusion(record.id)}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Link2 className="w-3 h-3" />
                          {isSelected ? '已选中关联' : '关联到结论'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {reviewRounds.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">历史复核记录</h3>
              <div className="space-y-4">
                {reviewRounds.map((round) => {
                  const opinion = getReviewOpinionByRoundId(round.id);
                  const conclusion = getFinalConclusionByRoundId(round.id);
                  return (
                    <div
                      key={round.id}
                      className="border-l-4 border-primary-300 pl-4 py-3 bg-gray-50 rounded-r-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">第 {round.roundNumber} 轮</span>
                          {conclusion && <ConclusionBadge result={conclusion.result} />}
                        </div>
                        <div className="text-xs text-gray-500">
                          <User className="w-3 h-3 inline mr-1" />
                          {round.reviewer}
                          <span className="mx-2">·</span>
                          {new Date(round.reviewDate).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      {opinion && (
                        <p className="text-sm text-gray-700 mb-2">{opinion.content}</p>
                      )}
                      {opinion && opinion.missingTimePoints.length > 0 && (
                        <p className="text-xs text-rose-600">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          缺失时间点：{opinion.missingTimePoints.join(', ')}
                        </p>
                      )}
                      {conclusion && conclusion.linkedCultureRecordId && (
                        <button
                          onClick={() => scrollToRecord(conclusion.linkedCultureRecordId!)}
                          className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                        >
                          <Link2 className="w-3 h-3 inline mr-1" />
                          查看关联的培养记录 →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">本轮复核</h3>
            <p className="text-xs text-gray-500 mb-4">
              复核意见、培养记录、时间点缺失将整合在同一轮提交
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  复核意见
                </label>
                <textarea
                  value={opinionContent}
                  onChange={(e) => setOpinionContent(e.target.value)}
                  placeholder="请输入复核意见..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              {missingTimePoints.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-xs font-medium text-rose-700 mb-1">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    标记缺失的时间点
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingTimePoints.map((tp) => (
                      <span
                        key={tp}
                        className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded"
                      >
                        {tp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div id="conclusion-section">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最终结论
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setConclusionResult('pass')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      conclusionResult === 'pass'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    通过
                  </button>
                  <button
                    onClick={() => setConclusionResult('fail')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      conclusionResult === 'fail'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    不通过
                  </button>
                  <button
                    onClick={() => setConclusionResult('pending')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      conclusionResult === 'pending'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    待确认
                  </button>
                </div>
              </div>

              {linkedRecordId && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-medium text-emerald-700 mb-1">
                    <Link2 className="w-3 h-3 inline mr-1" />
                    已关联培养记录
                  </p>
                  <p className="text-xs text-emerald-600">
                    {cultureRecords.find((r) => r.id === linkedRecordId)?.timePoint || '未知'}
                  </p>
                  <button
                    onClick={() => scrollToRecord(linkedRecordId)}
                    className="mt-1 text-xs text-emerald-600 hover:text-emerald-700"
                  >
                    跳转到培养记录 →
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <User className="w-3 h-3" />
                  <span>复核人：{currentUser.name}</span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!opinionContent.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  提交本轮复核
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  提交后将创建新的复核轮次，意见、记录、结论将关联在一起
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
