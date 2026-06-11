import React, { useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FlaskConical,
  GitBranch,
  Plus,
  Clock,
  FileText,
  Eye
} from 'lucide-react';
import { useSampleStore } from '@/store/useSampleStore';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { MOCK_SAMPLES } from '@/data/mockSamples';
import { MOCK_REAGENT_LOTS } from '@/data/mockReagents';
import StatusBadge from '@/components/StatusBadge';
import type { Sample, DiffAnalysisResult } from '@/types';

interface DiffAnalysisProps {
  sample?: Sample;
  onBack?: () => void;
  onNavigate?: (page: string) => void;
}

type Conclusion = 'support' | 'not_support' | 'inconclusive';

const DiffAnalysis: React.FC<DiffAnalysisProps> = ({ sample, onBack, onNavigate }) => {
  const { getSelectedSample, currentOperator } = useSampleStore();
  const { getLatestRun, getDiffAnalysisBySample, addDiffAnalysis, updateReagentLot } = useAnalysisStore();

  const sampleFromStore = useSampleStore(state => {
    const selected = state.getSelectedSample();
    return selected ?? MOCK_SAMPLES[0];
  });
  const effectiveSample = sample ?? sampleFromStore;
  const latestRun = getLatestRun(effectiveSample.barcode);
  const history = getDiffAnalysisBySample(effectiveSample.barcode);

  const [showStudentView, setShowStudentView] = useState(false);
  const [newAnalysis, setNewAnalysis] = useState({
    conclusion: 'inconclusive' as Conclusion,
    conclusionText: '',
    evidence: '' as string,
    limitations: '' as string,
    reagentLotId: latestRun?.reagentLotId || ''
  });
  const [isAdding, setIsAdding] = useState(false);

  const conclusionOptions = [
    { value: 'support', label: '当前证据支持存在差异', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'inconclusive', label: '当前证据不足以得出结论', icon: HelpCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'not_support', label: '当前证据不支持存在差异', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' }
  ];

  const handleAddAnalysis = () => {
    if (!newAnalysis.conclusionText) return;

    const result = addDiffAnalysis(
      effectiveSample.barcode,
      newAnalysis.conclusion,
      newAnalysis.conclusionText,
      newAnalysis.evidence.split('\n').filter(Boolean),
      newAnalysis.limitations.split('\n').filter(Boolean),
      currentOperator,
      newAnalysis.reagentLotId || undefined
    );

    setIsAdding(false);
    setNewAnalysis({
      conclusion: 'inconclusive',
      conclusionText: '',
      evidence: '',
      limitations: '',
      reagentLotId: latestRun?.reagentLotId || ''
    });
  };

  const handleReagentUpdate = (reagentLotId: string) => {
    if (latestRun) {
      updateReagentLot(latestRun.runId, reagentLotId);
    }
  };

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
                  <GitBranch size={22} className="text-indigo-600" />
                  差异分析（迭代判断）
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-slate-500 font-mono">{effectiveSample.barcode}</span>
                  <StatusBadge status={effectiveSample.status} size="sm" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStudentView(!showStudentView)}
                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm flex items-center gap-1.5 ${showStudentView
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                  }`}
              >
                <Eye size={14} />
                学生视图 {showStudentView ? '开' : '关'}
              </button>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} />
                  新增差异分析轮次
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {showStudentView && (
          <div className="mb-6 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Eye size={20} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-indigo-800 mb-2">📚 学生课堂：什么是"迭代判断"？</h3>
                <div className="text-xs text-indigo-700 space-y-2 leading-relaxed">
                  <p>
                    <strong>为什么不做一次性判断？</strong>因为医学检验数据常常是不完整的！
                    就像侦探破案，刚开始只有少量线索时不能随便下结论。
                  </p>
                  <p>
                    <strong>迭代判断的意思是：</strong>
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>第一轮：有多少证据，说多少话（比如「证据不足」）</li>
                    <li>补充数据（补录试剂批号、补做时间点等）</li>
                    <li>第二轮：根据新证据重新判断</li>
                    <li>保留所有历史记录，让别人能看到判断是怎么一步步变的</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAdding && (
          <div className="mb-6 bg-white rounded-xl border-2 border-indigo-300 shadow-sm overflow-hidden">
            <div className="bg-indigo-600 px-5 py-3 text-white">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus size={18} />
                新增差异分析轮次（第 {history.length + 1} 轮）
              </h3>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2.5 block flex items-center gap-1.5">
                  <FlaskConical size={14} className="text-amber-600" />
                  关联试剂批号（补录后自动更新质控）
                </label>
                <select
                  value={newAnalysis.reagentLotId}
                  onChange={(e) => {
                    setNewAnalysis({ ...newAnalysis, reagentLotId: e.target.value });
                    if (e.target.value) handleReagentUpdate(e.target.value);
                  }}
                  className="w-full max-w-lg px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- 选择试剂批号（质控将联动更新）--</option>
                  {MOCK_REAGENT_LOTS.map(reagent => (
                    <option key={reagent.lotId} value={reagent.lotId}>
                      {reagent.lotId} - {reagent.reagentName}（{reagent.manufacturer}）
                    </option>
                  ))}
                </select>
                {newAnalysis.reagentLotId && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    已补录试剂批号，质控参数已自动重新计算
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2.5 block">
                  本轮判断结论
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {conclusionOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setNewAnalysis({ ...newAnalysis, conclusion: option.value as Conclusion })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${newAnalysis.conclusion === option.value
                          ? `${option.color} ring-2 ring-offset-2`
                          : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <option.icon size={20} className={option.color.split(' ')[0]} />
                        <div>
                          <p className={`text-sm font-medium ${option.color.split(' ')[0]}`}>
                            {option.label}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  结论说明
                </label>
                <textarea
                  value={newAnalysis.conclusionText}
                  onChange={(e) => setNewAnalysis({ ...newAnalysis, conclusionText: e.target.value })}
                  placeholder="请详细描述本轮分析的结论，例如：当前证据支持用药组与对照组间存在显著差异..."
                  rows={2}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    支持证据（每行一条）
                  </label>
                  <textarea
                    value={newAnalysis.evidence}
                    onChange={(e) => setNewAnalysis({ ...newAnalysis, evidence: e.target.value })}
                    placeholder={"24h迁移率差异达23.9%\nP值 < 0.05\n各时间点趋势一致"}
                    rows={4}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    局限性 / 待补充（每行一条）
                  </label>
                  <textarea
                    value={newAnalysis.limitations}
                    onChange={(e) => setNewAnalysis({ ...newAnalysis, limitations: e.target.value })}
                    placeholder={"样本量较小 (n=3)\n建议补充48h数据\n缺少细胞增殖对照组"}
                    rows={4}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2.5 rounded-lg border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleAddAnalysis}
                  disabled={!newAnalysis.conclusionText}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <RefreshCw size={14} />
                  保存本轮分析
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock size={18} className="text-slate-500" />
            差异分析历史（共 {history.length} 轮）
          </h2>

          {history.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
              <GitBranch size={40} className="mx-auto mb-3 text-slate-300" />
              <h3 className="font-medium text-slate-600 mb-1">暂无差异分析记录</h3>
              <p className="text-sm text-slate-400">点击右上角「新增差异分析轮次」开始迭代判断</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200"></div>
              {history.map((item, idx) => {
                const conclusionInfo = conclusionOptions.find(c => c.value === item.conclusion)!;
                return (
                  <div key={item.analysisId} className="relative pl-16 pb-6">
                    <div className={`absolute left-3 w-7 h-7 rounded-full ${conclusionInfo.color.split(' ')[0].replace('text-', 'bg-')} text-white flex items-center justify-center text-xs font-bold shadow-md z-10`}>
                      {history.length - idx}
                    </div>
                    <div className={`rounded-xl border-2 ${conclusionInfo.color} overflow-hidden bg-white`}>
                      <div className={`px-5 py-3 ${conclusionInfo.color} border-b-2 border-current`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <conclusionInfo.icon size={18} />
                            <span className="font-semibold">{item.conclusionText}</span>
                          </div>
                          <span className="text-xs font-mono opacity-75">
                            第 {item.roundNumber} 轮 · {item.timestamp.toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-emerald-50/60 rounded-lg p-4 border border-emerald-100">
                            <h4 className="text-xs font-semibold text-emerald-700 uppercase mb-2.5 flex items-center gap-1.5">
                              <CheckCircle2 size={12} />
                              支持证据
                            </h4>
                            <ul className="space-y-1.5">
                              {item.evidence.map((ev, i) => (
                                <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                                  <span className="text-emerald-500 mt-0.5">✓</span>
                                  {ev}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-amber-50/60 rounded-lg p-4 border border-amber-100">
                            <h4 className="text-xs font-semibold text-amber-700 uppercase mb-2.5 flex items-center gap-1.5">
                              <AlertTriangle size={12} />
                              局限性说明
                            </h4>
                            <ul className="space-y-1.5">
                              {item.limitations.map((lim, i) => (
                                <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                                  <span className="text-amber-500 mt-0.5">⚠</span>
                                  {lim}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <span>分析人：{item.operator}</span>
                          {item.reagentLotId ? (
                            <span className="flex items-center gap-1">
                              <FlaskConical size={12} />
                              试剂批号：<code className="bg-slate-100 px-1.5 py-0.5 rounded">{item.reagentLotId}</code>
                            </span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1">
                              <AlertTriangle size={12} />
                              未补录试剂批号
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {history.length > 0 && showStudentView && (
          <div className="mt-8 bg-emerald-50 rounded-xl border-2 border-emerald-200 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-emerald-800 mb-2">📚 学生观察：你能看到判断的变化吗？</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  注意看上面的时间轴，每一轮的结论都<strong>不是简单的「有差异/无差异」</strong>，
                  而是「当前证据支持/不支持/不足」。
                  这非常重要！因为科学是严谨的，证据不足时不能乱下结论。
                  当补充了试剂批号后（看每一轮底部的试剂批号），质控状态会更新，
                  下一轮的判断就可能变得更有把握！
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffAnalysis;
