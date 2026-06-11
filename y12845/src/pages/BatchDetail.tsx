import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { BatchStatusBadge, SampleStatusBadge, InfoTooltip } from '@/components/StatusBadges';
import GroupStatsChart from '@/components/GroupStatsChart';
import {
  ArrowLeft,
  FlaskConical,
  Calculator,
  Edit3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  History,
  FileText,
  Skull,
  ChevronDown,
  ChevronUp,
  Save,
  GitBranch,
  Image,
  FileSpreadsheet,
  Link2,
  RefreshCw,
} from 'lucide-react';

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { batches, samples, updateBatchStatus, updateBatchConclusion, correctSampleValue, markSampleContaminated, addPathologyNote, recalculateGroupStats } = useAppStore();

  const batch = batches.find((b) => b.id === id);
  const batchSamples = samples.filter((s) => s.batchId === id);
  const validSamples = batchSamples.filter((s) => s.status !== 'contaminated');
  const contaminatedSamples = batchSamples.filter((s) => s.status === 'contaminated');

  const [showExplanation, setShowExplanation] = useState(true);
  const [editingConclusion, setEditingConclusion] = useState(false);
  const [conclusionText, setConclusionText] = useState(batch?.conclusion || '');
  const [correctionModal, setCorrectionModal] = useState<{ sampleId: string; field: string; oldValue: number } | null>(null);
  const [newValue, setNewValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [newNote, setNewNote] = useState('');
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [showLineage, setShowLineage] = useState(false);

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-abyss-500">
        <FlaskConical className="w-16 h-16 mb-4 opacity-30" />
        <p>批次不存在</p>
      </div>
    );
  }

  const handleApprove = () => {
    updateBatchStatus(batch.id, 'approved');
  };

  const handleNeedsReview = () => {
    updateBatchStatus(batch.id, 'needs_review');
  };

  const handleSaveConclusion = () => {
    updateBatchConclusion(batch.id, conclusionText);
    setEditingConclusion(false);
  };

  const handleOpenCorrection = (sampleId: string, field: string, oldValue: number) => {
    setCorrectionModal({ sampleId, field, oldValue });
    setNewValue(String(oldValue));
    setCorrectionReason('');
  };

  const handleSubmitCorrection = () => {
    if (!correctionModal) return;
    correctSampleValue(
      correctionModal.sampleId,
      correctionModal.field,
      correctionModal.oldValue,
      parseFloat(newValue),
      correctionReason,
      '张管理员'
    );
    setCorrectionModal(null);
  };

  const handleMarkContaminated = (sampleId: string) => {
    const reason = prompt('请输入污染原因：');
    if (reason) {
      markSampleContaminated(sampleId, reason, '张管理员');
      recalculateGroupStats(batch.id);
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      addPathologyNote(batch.id, newNote.trim(), '张管理员');
      setNewNote('');
    }
  };

  const scoreColor = batch.batchEffectScore >= 0.8 ? 'text-moss-600' : batch.batchEffectScore >= 0.7 ? 'text-amber-600' : 'text-crimson-600';
  const scoreBg = batch.batchEffectScore >= 0.8 ? 'bg-moss-100' : batch.batchEffectScore >= 0.7 ? 'bg-amber-100' : 'bg-crimson-100';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-md hover:bg-abyss-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-abyss-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-serif-cn font-bold text-abyss-900">{batch.name}</h2>
              <BatchStatusBadge status={batch.status} />
            </div>
            <p className="text-sm text-abyss-500 mt-1">
              实验日期：{batch.date} | 复核人：{batch.reviewer || '未分配'} | 样本数：{batchSamples.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleNeedsReview} className="btn-secondary flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-ember-500" />
            <span>标记需复核</span>
          </button>
          <button onClick={handleApprove} className="btn-primary flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>通过复核</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-base overflow-hidden animate-fade-in-up stagger-1">
            <div className="px-6 py-4 border-b border-abyss-100/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-abyss-500" />
                <h3 className="text-base font-semibold text-abyss-800">批次效应分析</h3>
                <InfoTooltip text="批次效应得分反映同一批次内各组数据的一致性，得分越高说明重复性越好" />
              </div>
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-sm text-abyss-500 hover:text-abyss-700 flex items-center gap-1"
              >
                {showExplanation ? '收起解释' : '展开解释'}
                {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-6 mb-4">
                <div className={`w-24 h-24 rounded-full ${scoreBg} flex items-center justify-center`}>
                  <span className={`text-3xl font-bold ${scoreColor}`}>
                    {(batch.batchEffectScore * 100).toFixed(0)}
                    <span className="text-lg">分</span>
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-abyss-600 mb-2">
                    {batch.batchEffectScore >= 0.8 ? (
                      <span className="text-moss-600 font-medium">批次效应正常，数据可靠</span>
                    ) : batch.batchEffectScore >= 0.7 ? (
                      <span className="text-amber-600 font-medium">批次效应偏低，建议复核关键样本</span>
                    ) : (
                      <span className="text-crimson-600 font-medium">批次效应异常，需仔细排查原因</span>
                    )}
                  </div>
                  <div className="h-3 bg-abyss-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        batch.batchEffectScore >= 0.8 ? 'bg-moss-500' : batch.batchEffectScore >= 0.7 ? 'bg-amber-500' : 'bg-crimson-500'
                      }`}
                      style={{ width: `${batch.batchEffectScore * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-abyss-400 mt-1">
                    <span>0</span>
                    <span className="text-amber-500">75分阈值</span>
                    <span>100</span>
                  </div>
                </div>
              </div>

              {showExplanation && (
                <div className="mt-4 p-4 bg-ivory-50 rounded-lg border border-ivory-200 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-abyss-100 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-4 h-4 text-abyss-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-abyss-800 mb-2">复核解释（给新同事看）</h4>
                      <p className="text-sm text-abyss-600 leading-relaxed">
                        {batch.batchEffectExplanation}
                      </p>
                      <div className="mt-3 pt-3 border-t border-ivory-200">
                        <p className="text-xs text-abyss-500">
                          <strong>小贴士：</strong>批次效应得分 = 1 - 变异系数(CV)。CV = 标准差/平均值。
                          CV越小说明组内数据越集中，实验重复性越好。一般建议得分在 75-90 分之间。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-base overflow-hidden animate-fade-in-up stagger-2">
            <div className="px-6 py-4 border-b border-abyss-100/80">
              <div className="flex items-center gap-2">
                <BarChartIcon />
                <h3 className="text-base font-semibold text-abyss-800">分组统计</h3>
                <InfoTooltip text="按抗生素浓度分组统计存活率，观察剂量-效应关系" />
              </div>
            </div>
            <div className="p-6">
              <GroupStatsChart statistics={batch.groupStatistics} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {batch.groupStatistics.map((stat, idx) => (
                  <div key={stat.groupName} className="p-3 bg-ivory-50 rounded-lg">
                    <div className="text-xs text-abyss-500 mb-1">{stat.groupName}</div>
                    <div className="text-xl font-bold text-abyss-800">{stat.avgSurvivalRate}%</div>
                    <div className="text-xs text-abyss-500 mt-1">
                      ±{stat.stdDev} · n={stat.sampleCount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-base overflow-hidden animate-fade-in-up stagger-3">
            <div className="px-6 py-4 border-b border-abyss-100/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-abyss-500" />
                  <h3 className="text-base font-semibold text-abyss-800">人工修正记录</h3>
                  <InfoTooltip text="所有对原始数据的人工修改都会记录在这里，保留修改痕迹" />
                </div>
                {contaminatedSamples.length > 0 && (
                  <span className="text-xs text-crimson-600 flex items-center gap-1">
                    <Skull className="w-3.5 h-3.5" />
                    已标记 {contaminatedSamples.length} 个污染样本
                  </span>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {batchSamples
                  .filter((s) => s.correctionHistory && s.correctionHistory.length > 0)
                  .flatMap((s) =>
                    s.correctionHistory!.map((corr) => (
                      <div key={corr.id} className="flex items-center gap-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Edit3 className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-abyss-800">{s.sampleId}</span>
                            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                              {corr.fieldName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-abyss-500 line-through">{corr.oldValue}</span>
                            <span className="text-abyss-300">→</span>
                            <span className="text-sm font-medium text-amber-700">{corr.newValue}</span>
                          </div>
                          <p className="text-xs text-abyss-500 mt-1 truncate">{corr.reason}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-abyss-500">{corr.operator}</div>
                          <div className="text-xs text-abyss-400">{corr.timestamp}</div>
                        </div>
                      </div>
                    ))
                  )}
                {batchSamples.filter((s) => s.correctionHistory && s.correctionHistory.length > 0).length === 0 && (
                  <p className="text-sm text-abyss-400 text-center py-4">暂无修正记录</p>
                )}
              </div>
            </div>
          </div>

          <div className="card-base overflow-hidden animate-fade-in-up stagger-4">
            <div className="px-6 py-4 border-b border-abyss-100/80">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-abyss-500" />
                <h3 className="text-base font-semibold text-abyss-800">样本清单</h3>
                <span className="text-xs text-abyss-400">（共 {batchSamples.length} 个样本，有效 {validSamples.length} 个）</span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full">
                <thead className="sticky top-0 bg-ivory-50/95 backdrop-blur-sm">
                  <tr>
                    <th className="table-header text-left px-4 py-3">原始行号</th>
                    <th className="table-header text-left px-4 py-3">样本ID</th>
                    <th className="table-header text-left px-4 py-3">组别</th>
                    <th className="table-header text-right px-4 py-3">存活率</th>
                    <th className="table-header text-left px-4 py-3">图片</th>
                    <th className="table-header text-left px-4 py-3">状态</th>
                    <th className="table-header text-right px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-abyss-50">
                  {batchSamples.map((sample) => (
                    <tr
                      key={sample.id}
                      className={`${
                        sample.status === 'contaminated' ? 'bg-crimson-50/50' : ''
                      } hover:bg-abyss-50/30 transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-abyss-600 bg-abyss-50 px-2 py-0.5 rounded">
                          #{sample.originalRowNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedSample(selectedSample === sample.id ? null : sample.id)}
                          className="text-sm font-medium text-abyss-700 hover:text-abyss-900 flex items-center gap-1"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          {sample.sampleId}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-abyss-600">{sample.groupName}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-medium ${
                          sample.survivalRate >= 80 ? 'text-moss-600' : sample.survivalRate >= 40 ? 'text-amber-600' : 'text-crimson-600'
                        }`}>
                          {sample.survivalRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-abyss-500 font-mono">{sample.imageName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <SampleStatusBadge status={sample.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenCorrection(sample.id, 'survivalRate', sample.survivalRate)}
                            className="p-1.5 rounded hover:bg-amber-100 text-amber-600 transition-colors"
                            title="修正数值"
                            disabled={sample.status === 'contaminated'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {sample.status !== 'contaminated' ? (
                            <button
                              onClick={() => handleMarkContaminated(sample.id)}
                              className="p-1.5 rounded hover:bg-crimson-100 text-crimson-600 transition-colors"
                              title="标记污染"
                            >
                              <Skull className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              className="p-1.5 rounded hover:bg-moss-100 text-moss-600 transition-colors"
                              title="取消污染标记"
                              onClick={() => {
                                const store = useAppStore.getState();
                                store.unmarkSampleContaminated(sample.id);
                                store.recalculateGroupStats(batch.id);
                              }}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-base overflow-hidden animate-fade-in-up stagger-2">
            <div className="px-6 py-4 border-b border-abyss-100/80">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-abyss-500" />
                <h3 className="text-base font-semibold text-abyss-800">最终结论</h3>
              </div>
            </div>
            <div className="p-6">
              {editingConclusion ? (
                <div className="space-y-3">
                  <textarea
                    value={conclusionText}
                    onChange={(e) => setConclusionText(e.target.value)}
                    className="w-full h-32 p-3 border border-abyss-200 rounded-md text-sm text-abyss-700 focus:outline-none focus:ring-2 focus:ring-abyss-300 focus:border-transparent resize-none"
                    placeholder="请输入最终结论..."
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingConclusion(false)} className="btn-secondary text-sm py-1.5 px-3">
                      取消
                    </button>
                    <button onClick={handleSaveConclusion} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
                      <Save className="w-4 h-4" />
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditingConclusion(true)} className="cursor-pointer group">
                  <p className="text-sm text-abyss-700 leading-relaxed min-h-[60px]">
                    {batch.conclusion || '点击添加最终结论...'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-abyss-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit3 className="w-3 h-3" />
                    点击编辑
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-abyss-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-abyss-500">导师可见状态</span>
                  {batch.status === 'approved' ? (
                    <span className="text-moss-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      可直接使用
                    </span>
                  ) : batch.status === 'needs_review' ? (
                    <span className="text-ember-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      需找管理员复核
                    </span>
                  ) : (
                    <span className="text-abyss-500 flex items-center gap-1">
                      <ClockIcon />
                      复核中
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card-base overflow-hidden animate-fade-in-up stagger-3">
            <div className="px-6 py-4 border-b border-abyss-100/80">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-abyss-500" />
                <h3 className="text-base font-semibold text-abyss-800">谱系追踪</h3>
                <InfoTooltip text="从结论反向追溯到具体样本、图片和来源材料" />
              </div>
            </div>
            <div className="p-4">
              <button
                onClick={() => navigate(`/lineage/${batch.id}`)}
                className="w-full p-4 border-2 border-dashed border-abyss-200 rounded-lg hover:border-abyss-400 hover:bg-abyss-50/50 transition-all flex items-center justify-center gap-2 text-sm text-abyss-500 hover:text-abyss-700"
              >
                <GitBranch className="w-5 h-5" />
                <span>打开谱系追踪视图</span>
              </button>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-abyss-500">
                  <div className="w-6 h-6 rounded bg-ember-100 flex items-center justify-center">
                    <FileText className="w-3 h-3 text-ember-600" />
                  </div>
                  <span>最终结论</span>
                </div>
                <div className="ml-3 h-4 w-px bg-abyss-200"></div>
                <div className="flex items-center gap-2 text-xs text-abyss-500">
                  <div className="w-6 h-6 rounded bg-abyss-100 flex items-center justify-center">
                    <Calculator className="w-3 h-3 text-abyss-600" />
                  </div>
                  <span>分组统计（{batch.groupStatistics.length} 组）</span>
                </div>
                <div className="ml-3 h-4 w-px bg-abyss-200"></div>
                <div className="flex items-center gap-2 text-xs text-abyss-500">
                  <div className="w-6 h-6 rounded bg-moss-100 flex items-center justify-center">
                    <Image className="w-3 h-3 text-moss-600" />
                  </div>
                  <span>原始样本（{batchSamples.length} 个）</span>
                </div>
                <div className="ml-3 h-4 w-px bg-abyss-200"></div>
                <div className="flex items-center gap-2 text-xs text-abyss-500">
                  <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
                    <FileSpreadsheet className="w-3 h-3 text-amber-600" />
                  </div>
                  <span>来源材料备注</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card-base overflow-hidden animate-fade-in-up stagger-4">
            <div className="px-6 py-4 border-b border-abyss-100/80">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-abyss-500" />
                <h3 className="text-base font-semibold text-abyss-800">病理备注</h3>
              </div>
            </div>
            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
              {batch.pathologyNotes.map((note) => (
                <div key={note.id} className="p-3 bg-ivory-50 rounded-lg">
                  <p className="text-sm text-abyss-700 leading-relaxed">{note.content}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-abyss-400">
                    <span>{note.author}</span>
                    <span>{note.timestamp}</span>
                  </div>
                </div>
              ))}
              {batch.pathologyNotes.length === 0 && (
                <p className="text-sm text-abyss-400 text-center py-2">暂无病理备注</p>
              )}

              <div className="pt-2 border-t border-abyss-100">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="添加备注..."
                  className="w-full h-20 p-2 border border-abyss-200 rounded-md text-sm text-abyss-700 focus:outline-none focus:ring-2 focus:ring-abyss-300 focus:border-transparent resize-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="mt-2 w-full py-1.5 bg-abyss-700 text-white text-sm rounded-md hover:bg-abyss-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加备注
                </button>
              </div>
            </div>
          </div>

          {selectedSample && (
            <div className="card-base overflow-hidden animate-fade-in-up">
              <div className="px-4 py-3 border-b border-abyss-100/80 bg-abyss-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-abyss-700">
                    样本详情 - {batchSamples.find(s => s.id === selectedSample)?.sampleId}
                  </span>
                  <button onClick={() => setSelectedSample(null)}>
                    <XCircle className="w-4 h-4 text-abyss-400 hover:text-abyss-600" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {(() => {
                  const s = batchSamples.find(s => s.id === selectedSample);
                  if (!s) return null;
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-abyss-500">原始行号</span>
                        <span className="font-mono font-medium text-abyss-800">#{s.originalRowNumber}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-abyss-500">图片文件名</span>
                        <span className="font-mono text-abyss-700">{s.imageName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-abyss-500">组别</span>
                        <span className="text-abyss-700">{s.groupName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-abyss-500">浓度</span>
                        <span className="text-abyss-700">{s.concentration} μg/mL</span>
                      </div>
                      <div className="pt-2 border-t border-abyss-100">
                        <p className="text-xs text-abyss-500 mb-1">来源备注</p>
                        <p className="text-sm text-abyss-700">{s.sourceNote}</p>
                      </div>
                      {s.contaminationReason && (
                        <div className="pt-2 border-t border-abyss-100">
                          <p className="text-xs text-crimson-500 mb-1">污染原因</p>
                          <p className="text-sm text-crimson-700">{s.contaminationReason}</p>
                        </div>
                      )}
                      {s.correctionHistory && s.correctionHistory.length > 0 && (
                        <div className="pt-2 border-t border-abyss-100">
                          <p className="text-xs text-amber-500 mb-1">修正历史</p>
                          {s.correctionHistory.map(c => (
                            <div key={c.id} className="text-xs text-abyss-600">
                              {c.fieldName}: {c.oldValue} → {c.newValue} ({c.reason})
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {correctionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-soft-lg w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-lg font-semibold text-abyss-800 mb-4">人工修正数值</h3>
            <div className="space-y-4">
              <div>
                <label className="label-text block mb-1.5">原始值</label>
                <div className="p-3 bg-abyss-50 rounded-md text-abyss-500 line-through">
                  {correctionModal.oldValue}
                </div>
              </div>
              <div>
                <label className="label-text block mb-1.5">新值</label>
                <input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full p-3 border border-abyss-200 rounded-md text-abyss-800 focus:outline-none focus:ring-2 focus:ring-abyss-300"
                />
              </div>
              <div>
                <label className="label-text block mb-1.5">修正原因</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full h-24 p-3 border border-abyss-200 rounded-md text-abyss-700 focus:outline-none focus:ring-2 focus:ring-abyss-300 resize-none"
                  placeholder="请说明修正原因，如：原始图像识别有误，人工复核后修正..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setCorrectionModal(null)} className="btn-secondary">
                取消
              </button>
              <button
                onClick={handleSubmitCorrection}
                disabled={!newValue || !correctionReason.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认修正
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BarChartIcon() {
  return (
    <svg className="w-5 h-5 text-abyss-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );
}
