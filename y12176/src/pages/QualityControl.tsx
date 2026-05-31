import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Copy,
  Tag,
  RefreshCw,
  User,
  CheckCircle,
  XCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../store/useStore';
import DifficultyBadge from '../components/DifficultyBadge';
import TagBadge from '../components/TagBadge';
import { getDifficultyLabel, formatDateTime, getCategoryLabel } from '../utils/algorithms';
import type { DifficultyLevel, KnowledgeCategory } from '../types';

const difficultyToNumber: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const numberToDifficulty: Record<number, DifficultyLevel> = {
  1: 'easy',
  2: 'medium',
  3: 'hard',
};

export default function QualityControl() {
  const {
    questions,
    knowledgeTags,
    duplicateGroups,
    difficultyDrifts,
    runDuplicateDetection,
    runDifficultyDriftDetection,
    resolveDuplicate,
    resolveDrift,
    assignDrift,
    updateQuestionTags,
    setCurrentPage,
    setSelectedQuestionId,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'drift' | 'duplicate' | 'missing'>('drift');
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});

  const missingTagQuestions = useMemo(() => {
    return questions.filter(q => q.tagStatus === 'missing' || q.tags.length === 0);
  }, [questions]);

  const driftTrendData = useMemo(() => {
    const categoryDrifts: Record<KnowledgeCategory, { date: string; drift: number }[]> = {
      rhythm: [], harmony: [], melody: [], interval: [], chord: []
    };

    difficultyDrifts.forEach(drift => {
      const q = questions.find(qq => qq.id === drift.questionId);
      if (!q) return;
      q.tags.forEach(tagId => {
        const tag = knowledgeTags.find(t => t.id === tagId);
        if (tag) {
          const date = new Date(drift.detectedAt).toLocaleDateString('zh-CN');
          const existing = categoryDrifts[tag.category].find(d => d.date === date);
          if (existing) {
            existing.drift = Math.max(existing.drift, drift.driftScore);
          } else {
            categoryDrifts[tag.category].push({ date, drift: drift.driftScore });
          }
        }
      });
    });

    const allDates = new Set<string>();
    Object.values(categoryDrifts).forEach(arr => arr.forEach(d => allDates.add(d.date)));
    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map(date => {
      const point: Record<string, any> = { date };
      (Object.keys(categoryDrifts) as KnowledgeCategory[]).forEach(cat => {
        const data = categoryDrifts[cat].find(d => d.date === date);
        point[getCategoryLabel(cat)] = data ? Math.round(data.drift * 100) : 0;
      });
      return point;
    });
  }, [difficultyDrifts, questions, knowledgeTags]);

  const handleResolveDuplicate = (groupId: string, keepId: string) => {
    resolveDuplicate(groupId, keepId);
  };

  const handleResolveDrift = (driftId: string, action: 'keep' | 'adjust') => {
    const drift = difficultyDrifts.find(d => d.id === driftId);
    if (!drift) return;

    let newDifficulty: DifficultyLevel | undefined;
    if (action === 'adjust') {
      if (drift.actualDifficulty >= 0.8) newDifficulty = 'easy';
      else if (drift.actualDifficulty >= 0.5) newDifficulty = 'medium';
      else newDifficulty = 'hard';
    }

    resolveDrift(driftId, action, newDifficulty);
  };

  const handleSaveTags = (questionId: string) => {
    const tags = selectedTags[questionId] || [];
    updateQuestionTags(questionId, tags);
    setSelectedTags(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const toggleTagSelection = (questionId: string, tagId: string) => {
    setSelectedTags(prev => {
      const current = prev[questionId] || [];
      return {
        ...prev,
        [questionId]: current.includes(tagId)
          ? current.filter(t => t !== tagId)
          : [...current, tagId]
      };
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => setActiveTab('drift')}
          className={`bg-white rounded-2xl p-6 shadow-lg border-2 cursor-pointer transition-all duration-300 ${
            activeTab === 'drift'
              ? 'border-rose-500 shadow-rose-100'
              : 'border-transparent hover:border-rose-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">难度漂移预警</p>
              <p className="text-2xl font-bold text-slate-800">
                {difficultyDrifts.filter(d => d.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('duplicate')}
          className={`bg-white rounded-2xl p-6 shadow-lg border-2 cursor-pointer transition-all duration-300 ${
            activeTab === 'duplicate'
              ? 'border-amber-500 shadow-amber-100'
              : 'border-transparent hover:border-amber-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Copy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">疑似重复题目</p>
              <p className="text-2xl font-bold text-slate-800">
                {duplicateGroups.filter(g => g.status !== 'resolved').length} 组
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('missing')}
          className={`bg-white rounded-2xl p-6 shadow-lg border-2 cursor-pointer transition-all duration-300 ${
            activeTab === 'missing'
              ? 'border-blue-500 shadow-blue-100'
              : 'border-transparent hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">标签缺失待处理</p>
              <p className="text-2xl font-bold text-slate-800">
                {missingTagQuestions.length} 题
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={runDifficultyDriftDetection}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            重新检测漂移
          </button>
          <button
            onClick={runDuplicateDetection}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            重新检测重复
          </button>
        </div>
      </div>

      {activeTab === 'drift' && driftTrendData.length > 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">各知识点难度漂移趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={driftTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} unit="%" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="节奏" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="和声" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="旋律" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="音程" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="和弦" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'drift' && (
        <div className="space-y-4">
          {difficultyDrifts.filter(d => d.status !== 'resolved').length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-slate-100">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-700">暂无难度漂移预警</p>
              <p className="text-sm text-slate-500 mt-1">所有题目难度与实际答题表现匹配良好</p>
            </div>
          ) : (
            difficultyDrifts.filter(d => d.status !== 'resolved').map((drift, idx) => {
              const question = questions.find(q => q.id === drift.questionId);
              if (!question) return null;

              const driftColor = drift.driftScore > 0.4 ? 'bg-rose-500' : drift.driftScore > 0.25 ? 'bg-amber-500' : 'bg-yellow-500';
              const expectedCorrect = drift.expectedDifficulty === 'easy' ? '80-100%' : drift.expectedDifficulty === 'medium' ? '50-80%' : '20-50%';

              return (
                <div
                  key={drift.id}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-3 h-3 rounded-full ${driftColor} animate-pulse`} />
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <DifficultyBadge difficulty={drift.expectedDifficulty} />
                        <span className="text-sm text-slate-500">
                          预期正确率: {expectedCorrect}
                        </span>
                        <span className="text-sm font-medium text-rose-600">
                          实际: {Math.round(drift.actualDifficulty * 100)}%
                        </span>
                      </div>

                      <p className="text-base font-medium text-slate-800 mb-2 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => {
                          setSelectedQuestionId(question.id);
                          setCurrentPage('question-detail');
                        }}
                      >
                        {question.title}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDateTime(drift.detectedAt)}
                        </span>
                        {drift.assignee && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            责任人: {drift.assignee}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">漂移程度</span>
                          <span className="font-medium text-slate-800">{Math.round(drift.driftScore * 100)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${driftColor} transition-all duration-500`}
                            style={{ width: `${drift.driftScore * 100}%` }}
                          />
                        </div>
                      </div>

                      {drift.actualDifficulty < 0.5 && drift.expectedDifficulty !== 'hard' ? (
                        <div className="mt-3 flex items-center gap-2 text-sm text-rose-600">
                          <TrendingDown className="w-4 h-4" />
                          <span>建议调整为更难等级</span>
                        </div>
                      ) : drift.actualDifficulty > 0.5 && drift.expectedDifficulty === 'hard' ? (
                        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                          <TrendingUp className="w-4 h-4" />
                          <span>建议调整为更容易等级</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleResolveDrift(drift.id, 'adjust')}
                        className="px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors font-medium text-sm flex items-center gap-1"
                      >
                        <ArrowRight className="w-4 h-4" />
                        调整难度
                      </button>
                      <button
                        onClick={() => handleResolveDrift(drift.id, 'keep')}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors font-medium text-sm"
                      >
                        保持原难度
                      </button>
                      {!drift.assignee && (
                        <button
                          onClick={() => assignDrift(drift.id, '李教研员')}
                          className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium text-sm"
                        >
                          指派给我
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'duplicate' && (
        <div className="space-y-4">
          {duplicateGroups.filter(g => g.status !== 'resolved').length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-slate-100">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-700">暂无重复题目</p>
              <p className="text-sm text-slate-500 mt-1">题库内容健康，未检测到重复</p>
            </div>
          ) : (
            duplicateGroups.filter(g => g.status !== 'resolved').map((group, idx) => (
              <div
                key={group.id}
                className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Copy className="w-5 h-5 text-amber-500" />
                    <span className="font-medium text-slate-800">
                      相似度 {Math.round(group.similarity * 100)}%
                    </span>
                    <span className="text-sm text-slate-500">
                      共 {group.questionIds.length} 题
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {group.questionIds.map((qid, qidx) => {
                    const q = questions.find(qq => qq.id === qid);
                    if (!q) return null;
                    return (
                      <div
                        key={qid}
                        className="p-4 bg-slate-50 rounded-xl border-2 border-transparent hover:border-amber-200 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <DifficultyBadge difficulty={q.difficulty} />
                              <span className="text-xs text-slate-500">ID: {q.id}</span>
                              <span className="text-xs text-slate-500">创建人: {q.createdBy}</span>
                            </div>
                            <p className="text-sm text-slate-700 mb-2">{q.title}</p>
                            <div className="flex flex-wrap gap-1">
                              {q.tags.map(tid => {
                                const tag = knowledgeTags.find(t => t.id === tid);
                                return tag ? <TagBadge key={tid} tag={tag} /> : null;
                              })}
                            </div>
                          </div>
                          <button
                            onClick={() => handleResolveDuplicate(group.id, qid)}
                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                          >
                            保留这题
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>下一步：</strong>请与题目创建人（{
                      Array.from(new Set(group.questionIds.map(id => questions.find(q => q.id === id)?.createdBy).filter(Boolean))).join('、')
                    }）沟通确认后，保留需要的题目，其他将标记为已废弃。
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'missing' && (
        <div className="space-y-4">
          {missingTagQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-slate-100">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-700">所有题目标签完整</p>
              <p className="text-sm text-slate-500 mt-1">题库标签覆盖率达到 100%</p>
            </div>
          ) : (
            missingTagQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Tag className="w-5 h-5 text-blue-500" />
                      <DifficultyBadge difficulty={q.difficulty} />
                      <span className="text-xs text-slate-500">ID: {q.id}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                        标签缺失
                      </span>
                    </div>
                    <p className="text-base font-medium text-slate-800 mb-2">{q.title}</p>
                    <p className="text-sm text-slate-500">创建人: {q.createdBy}</p>

                    {(selectedTags[q.id]?.length || 0) > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                        <p className="text-xs text-blue-600 mb-2">待确认标签（保存后进入待复核分支）：</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedTags[q.id]?.map(tid => {
                            const tag = knowledgeTags.find(t => t.id === tid);
                            return tag ? <TagBadge key={tid} tag={tag} onRemove={() => toggleTagSelection(q.id, tid)} /> : null;
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="text-xs font-medium text-slate-600 mb-2">选择知识点标签：</p>
                      <div className="flex flex-wrap gap-2">
                        {knowledgeTags.map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTagSelection(q.id, tag.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              (selectedTags[q.id] || []).includes(tag.id)
                                ? 'bg-indigo-500 text-white shadow-md'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            [{getCategoryLabel(tag.category)}] {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleSaveTags(q.id)}
                      disabled={!selectedTags[q.id]?.length}
                      className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      保存待确认
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>下一步：</strong>补充标签后进入待确认分支，请联系教研员（李教研员）进行二次复核，确认后标签状态更新为已确认。
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
