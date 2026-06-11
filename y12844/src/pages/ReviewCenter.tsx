import React, { useState } from 'react';
import {
  ArrowLeft,
  ClipboardCheck,
  FlaskConical,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  MessageSquare,
  FileBarChart,
  Eye,
  CheckCheck,
  UserCheck,
  ThermometerSun
} from 'lucide-react';
import { useSampleStore } from '@/store/useSampleStore';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { useReviewStore } from '@/store/useReviewStore';
import { MOCK_SAMPLES } from '@/data/mockSamples';
import { getCultureRecordBySample, getTimePointsBySample, getReagentById, MOCK_REAGENT_LOTS } from '@/data/mockReagents';
import StatusBadge from '@/components/StatusBadge';
import type { Sample, ReviewSection, ReviewComment } from '@/types';
import { FAILURE_CATEGORY_LABELS } from '@/types';

interface ReviewCenterProps {
  sample?: Sample;
  onBack?: () => void;
  onNavigate?: (page: string) => void;
}

const ReviewCenter: React.FC<ReviewCenterProps> = ({ sample, onBack, onNavigate }) => {
  const { getSelectedSample, currentOperator } = useSampleStore();
  const { getLatestRun, updateReagentLot } = useAnalysisStore();
  const {
    getRoundsBySample,
    createNewRound,
    addComment,
    updateCultureCheck,
    updateTimePointCheck,
    completeRound,
    autoCheckCultureRecord,
    autoCheckTimePoints
  } = useReviewStore();

  const sampleFromStore = useSampleStore(state => {
    const selected = state.getSelectedSample();
    return selected ?? MOCK_SAMPLES[0];
  });
  const effectiveSample = sample ?? sampleFromStore;
  const latestRun = getLatestRun(effectiveSample.barcode);
  const rounds = getRoundsBySample(effectiveSample.barcode);
  const currentRound = rounds[0];

  const cultureRecord = getCultureRecordBySample(effectiveSample.barcode);
  const timePoints = getTimePointsBySample(effectiveSample.barcode);

  const [showStudentView, setShowStudentView] = useState(false);
  const [showNewComment, setShowNewComment] = useState<ReviewSection | null>(null);
  const [newComment, setNewComment] = useState({
    content: '',
    suggestion: ''
  });
  const [selectedReagentLot, setSelectedReagentLot] = useState(latestRun?.reagentLotId || '');

  const sectionLabels: Record<ReviewSection, string> = {
    culture: '培养记录',
    analysis: '分析计算',
    qc: '质量控制',
    other: '其他事项'
  };

  const sectionColors: Record<ReviewSection, string> = {
    culture: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    analysis: 'bg-blue-50 border-blue-200 text-blue-700',
    qc: 'bg-amber-50 border-amber-200 text-amber-700',
    other: 'bg-slate-50 border-slate-200 text-slate-700'
  };

  const handleCompleteRound = () => {
    if (currentRound) {
      completeRound(currentRound.roundId);
    } else {
      const newRound = createNewRound(effectiveSample.barcode, currentOperator);
      addComment(newRound.roundId, 'other', '复核完成，数据确认无误', '可进入报告导出流程');
      completeRound(newRound.roundId);
    }
  };

  const handleAddComment = (section: ReviewSection) => {
    if (!currentRound || !newComment.content) return;

    addComment(currentRound.roundId, section, newComment.content, newComment.suggestion);
    setShowNewComment(null);
    setNewComment({ content: '', suggestion: '' });
  };

  const handleReagentUpdate = (lotId: string) => {
    setSelectedReagentLot(lotId);
    if (latestRun && lotId) {
      updateReagentLot(latestRun.runId, lotId);
    }
  };

  const renderCheckItem = (
    title: string,
    Icon: React.ComponentType<any>,
    isComplete: boolean,
    issues: string[],
    remark: string,
    onUpdate: (isComplete: boolean, issues: string[], remark: string) => void
  ) => (
    <div className={`rounded-xl border-2 p-5 ${isComplete ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-300'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isComplete ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Icon size={20} className={isComplete ? 'text-emerald-600' : 'text-amber-600'} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">{title}</h4>
            <p className={`text-xs ${isComplete ? 'text-emerald-600' : 'text-amber-600'} flex items-center gap-1`}>
              {isComplete ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {isComplete ? '检查通过' : '存在待处理问题'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${isComplete
            ? 'bg-emerald-600 text-white'
            : 'bg-amber-500 text-white'
          }`}>
          {issues.length} 个问题
        </div>
      </div>

      {issues.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {issues.map((issue, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <XCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-red-700 bg-red-50 px-2 py-1 rounded flex-1">{issue}</span>
            </div>
          ))}
        </div>
      )}

      {remark && (
        <p className={`text-xs p-2.5 rounded-lg ${isComplete
            ? 'bg-emerald-100/70 text-emerald-700'
            : 'bg-amber-100/70 text-amber-700'
          }`}>
          💡 {remark}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onBack?.()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft size={20} />
                返回样本列表
              </button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardCheck size={22} className="text-amber-600" />
                  复核中心
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-slate-500 font-mono">{effectiveSample.barcode}</span>
                  <StatusBadge status={effectiveSample.status} size="sm" />
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    第 {rounds.length > 0 ? rounds[0].roundNumber : 1} 轮复核
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStudentView(!showStudentView)}
                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm flex items-center gap-1.5 ${showStudentView
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'
                  }`}
              >
                <Eye size={14} />
                学生视图
              </button>
              <button
                onClick={handleCompleteRound}
                disabled={!currentRound || currentRound.status === 'completed'}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCheck size={14} />
                {currentRound?.status === 'completed' ? '复核已完成' : '完成本轮复核'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {showStudentView && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Eye size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 mb-2">📚 学生课堂：这一轮复核在检查什么？</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-amber-700">
                  <div className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="font-semibold text-amber-800 mb-1 flex items-center gap-1">
                      <FlaskConical size={12} />
                      ① 培养记录检查
                    </p>
                    <p>确认细胞是怎么养的、温度对不对、CO₂对不对、有没有签字。就像做饭前要检查食材新鲜不新鲜！</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="font-semibold text-amber-800 mb-1 flex items-center gap-1">
                      <Clock size={12} />
                      ② 时间点缺失检查
                    </p>
                    <p>0h、6h、12h、24h这些时间点都拍照片了吗？少了时间点就像看电影少了中间片段，不知道剧情怎么发展的！</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="font-semibold text-amber-800 mb-1 flex items-center gap-1">
                      <MessageSquare size={12} />
                      ③ 复核意见记录
                    </p>
                    <p>有问题要写清楚，还要给出处理建议。就像老师批改作业，不仅要打叉，还要告诉学生怎么改！</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderCheckItem(
                '培养记录检查',
                FlaskConical,
                currentRound?.cultureRecordCheck.isComplete ?? false,
                currentRound?.cultureRecordCheck.issues ?? autoCheckCultureRecord(effectiveSample.barcode).issues,
                currentRound?.cultureRecordCheck.remark ?? autoCheckCultureRecord(effectiveSample.barcode).remark,
                (complete, issues, remark) => currentRound && updateCultureCheck(currentRound.roundId, complete, issues, remark)
              )}

              {renderCheckItem(
                '时间点完整性检查',
                Clock,
                currentRound?.timePointCheck.isComplete ?? false,
                currentRound?.timePointCheck.issues ?? autoCheckTimePoints(effectiveSample.barcode).issues,
                currentRound?.timePointCheck.remark ?? autoCheckTimePoints(effectiveSample.barcode).remark,
                (complete, issues, remark) => currentRound && updateTimePointCheck(currentRound.roundId, complete, issues, remark)
              )}
            </div>

            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b-2 border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <MessageSquare size={18} className="text-blue-600" />
                    复核意见记录
                    <span className="text-xs text-slate-500 font-normal">
                      （共 {currentRound?.comments.length ?? 0} 条意见）
                    </span>
                  </h3>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {(!currentRound || currentRound.comments.length === 0) && (
                  <div className="text-center py-10 text-slate-400">
                    <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">暂无复核意见</p>
                    <p className="text-xs mt-1">点击下方分类按钮添加意见</p>
                  </div>
                )}

                {currentRound?.comments.map((comment: ReviewComment, idx: number) => (
                  <div
                    key={comment.commentId}
                    className={`rounded-xl border-2 p-4 ${sectionColors[comment.section]}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 border border-current">
                          #{idx + 1} {sectionLabels[comment.section]}
                        </span>
                      </div>
                      <UserCheck size={14} className="opacity-60" />
                    </div>
                    <p className="text-sm mb-2 leading-relaxed">{comment.content}</p>
                    <div className={`p-2.5 rounded-lg bg-white/60 border border-current/20 text-xs`}>
                      <span className="font-semibold">💡 处理建议：</span>
                      {comment.suggestion}
                    </div>
                  </div>
                ))}

                {currentRound?.status !== 'completed' && (
                  <div className="pt-4 border-t-2 border-dashed border-slate-200">
                    <p className="text-xs text-slate-500 mb-3 font-medium">👇 添加复核意见（按分类选择）：</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['culture', 'analysis', 'qc', 'other'] as ReviewSection[]).map((section) => (
                        <button
                          key={section}
                          onClick={() => setShowNewComment(showNewComment === section ? null : section)}
                          className={`px-3 py-2.5 rounded-lg border-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${showNewComment === section
                              ? `${sectionColors[section]} border-current shadow-sm`
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                          <Plus size={12} />
                          {sectionLabels[section]}
                        </button>
                      ))}
                    </div>

                    {showNewComment && (
                      <div className={`mt-4 rounded-xl border-2 p-4 ${sectionColors[showNewComment]}`}>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <MessageSquare size={14} />
                          添加「{sectionLabels[showNewComment]}」类意见
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium mb-1 block">问题描述</label>
                            <textarea
                              value={newComment.content}
                              onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                              placeholder="请详细描述发现的问题，例如：12h时间点图像缺失，影响动力学分析..."
                              rows={2}
                              className="w-full px-3 py-2 border-2 border-white/50 rounded-lg text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-white/70"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">处理建议</label>
                            <textarea
                              value={newComment.suggestion}
                              onChange={(e) => setNewComment({ ...newComment, suggestion: e.target.value })}
                              placeholder="建议如何处理，例如：补做12h时间点或接受缺失并在报告中说明..."
                              rows={2}
                              className="w-full px-3 py-2 border-2 border-white/50 rounded-lg text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-white/70"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setShowNewComment(null);
                                setNewComment({ content: '', suggestion: '' });
                              }}
                              className="px-4 py-2 rounded-lg bg-white/60 text-slate-600 hover:bg-white/80 text-xs transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleAddComment(showNewComment)}
                              disabled={!newComment.content}
                              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 size={12} />
                              确认添加
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-50 px-5 py-3 border-b-2 border-emerald-100">
                <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                  <FlaskConical size={16} />
                  培养记录详情
                </h3>
              </div>
              <div className="p-5 space-y-3">
                {cultureRecord ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs text-slate-500">培养开始</span>
                      <span className="text-sm font-mono text-slate-800">
                        {cultureRecord.cultureStart.toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <ThermometerSun size={12} />
                        培养温度
                      </span>
                      <span className={`text-sm font-bold ${Math.abs(cultureRecord.temperature - 37) > 0.5
                          ? 'text-red-600'
                          : 'text-emerald-600'
                        }`}>
                        {cultureRecord.temperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs text-slate-500">CO₂浓度</span>
                      <span className={`text-sm font-bold ${Math.abs(cultureRecord.co2Concentration - 5) > 0.5
                          ? 'text-red-600'
                          : 'text-emerald-600'
                        }`}>
                        {cultureRecord.co2Concentration.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs text-slate-500">培养基</span>
                      <span className="text-sm text-slate-800">{cultureRecord.mediumType}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <UserCheck size={12} />
                        操作人签字
                      </span>
                      <span className={`text-sm font-medium ${cultureRecord.operatorSign
                          ? 'text-emerald-600 flex items-center gap-1'
                          : 'text-red-600 flex items-center gap-1'
                        }`}>
                        {cultureRecord.operatorSign ? (
                          <><CheckCircle2 size={12} />{cultureRecord.operatorSign}</>
                        ) : (
                          <><XCircle size={12} />未签字</>
                        )}
                      </span>
                    </div>
                    {cultureRecord.remark && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">备注</p>
                        <p className="text-xs text-slate-700">{cultureRecord.remark}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-red-500">
                    <XCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">未找到培养记录</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50 px-5 py-3 border-b-2 border-blue-100">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                  <Clock size={16} />
                  时间点采集记录
                </h3>
              </div>
              <div className="p-5 space-y-2">
                {[0, 6, 12, 24].map((hour) => {
                  const point = timePoints.find(p => p.hour === hour);
                  const isPresent = point?.isPresent ?? false;
                  return (
                    <div
                      key={hour}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 ${isPresent
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${isPresent
                            ? 'bg-emerald-200 text-emerald-700'
                            : 'bg-red-200 text-red-700'
                          }`}>
                          {isPresent ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isPresent ? 'text-emerald-800' : 'text-red-800'}`}>
                            {hour}h
                          </p>
                          <p className={`text-xs ${isPresent ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isPresent ? '已采集' : '缺失'}
                          </p>
                        </div>
                      </div>
                      {point?.remark && (
                        <p className={`text-xs max-w-[160px] truncate ${isPresent ? 'text-emerald-600' : 'text-red-600'}`}>
                          {point.remark}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-amber-50 px-5 py-3 border-b-2 border-amber-100">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                  <FileBarChart size={16} />
                  试剂批号补录
                </h3>
              </div>
              <div className="p-5 space-y-3">
                <select
                  value={selectedReagentLot}
                  onChange={(e) => handleReagentUpdate(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">-- 选择试剂批号（质控将联动更新）--</option>
                  {MOCK_REAGENT_LOTS.map(reagent => (
                    <option key={reagent.lotId} value={reagent.lotId}>
                      {reagent.lotId} - {reagent.reagentName}
                    </option>
                  ))}
                </select>
                {selectedReagentLot && getReagentById(selectedReagentLot) && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
                    <p className="text-xs text-emerald-700">
                      <span className="font-medium">厂家：</span>
                      {getReagentById(selectedReagentLot)?.manufacturer}
                    </p>
                    <p className="text-xs text-emerald-700">
                      <span className="font-medium">有效期：</span>
                      {getReagentById(selectedReagentLot)?.expiryDate.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-emerald-600 mt-2 pt-2 border-t border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      质控数据已更新
                    </p>
                  </div>
                )}
              </div>
            </div>

            {latestRun?.status === 'failed' && latestRun.failureReason && (
              <div className="bg-red-50 rounded-xl border-2 border-red-300 p-5">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  分析失败记录
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium bg-white border border-red-200 text-red-700`}>
                      {FAILURE_CATEGORY_LABELS[latestRun.failureReason.category]}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${latestRun.failureReason.severity === 'severe'
                        ? 'bg-red-600 text-white'
                        : 'bg-orange-500 text-white'
                      }`}>
                      {latestRun.failureReason.severity === 'severe' ? '严重' : '中等'}
                    </span>
                  </div>
                  <p className="text-xs text-red-700 p-3 bg-white/70 rounded-lg border border-red-100">
                    {latestRun.failureReason.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showStudentView && (
          <div className="mt-8 bg-emerald-50 rounded-xl border-2 border-emerald-200 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <ClipboardCheck size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-800 mb-2">📚 小结：这次复核处理的是眼前这批具体材料</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  注意看：左边「培养记录」显示的是<strong>这个样本</strong>（{effectiveSample.barcode}）的培养条件，
                  「时间点检查」显示的是<strong>这批实验</strong>的时间点采集情况，
                  「复核意见」是针对<strong>这些具体问题</strong>（比如12h缺失、签字缺失等）写的。
                  而<strong>不是</strong>通用的模板化内容！
                  这样下一个人复核时，就能知道眼前这批材料具体有什么问题，是怎么处理的。
                  这就是医院检验师的工作习惯——每一批、每一样本都要具体问题具体分析！
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCenter;
