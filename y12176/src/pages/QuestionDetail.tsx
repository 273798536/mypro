import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Edit3,
  Check,
  X,
  Plus,
  Search,
  TrendingUp,
  User,
  Clock,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import TagBadge from '../components/TagBadge';
import DifficultyBadge from '../components/DifficultyBadge';
import type { DifficultyLevel, ChangeRecord } from '../types';
import {
  formatDateTime,
  getDifficultyLabel,
  getCategoryLabel,
  calculateCorrectRate,
} from '../utils/algorithms';
import { cn } from '../lib/utils';

export default function QuestionDetail() {
  const {
    selectedQuestionId,
    setCurrentPage,
    setSelectedQuestionId,
    getQuestionById,
    getTagsForQuestion,
    getDriftForQuestion,
    knowledgeTags,
    updateQuestionDifficulty,
    updateQuestionTags,
    resolveDrift,
    questions,
  } = useStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditingDifficulty, setIsEditingDifficulty] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('easy');
  const [difficultyRemark, setDifficultyRemark] = useState('');
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showDriftActions, setShowDriftActions] = useState(false);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);

  const question = selectedQuestionId ? getQuestionById(selectedQuestionId) : undefined;
  const currentTags = selectedQuestionId ? getTagsForQuestion(selectedQuestionId) : [];
  const drift = selectedQuestionId ? getDriftForQuestion(selectedQuestionId) : undefined;

  const handleBack = () => {
    setSelectedQuestionId(null);
    setCurrentPage('questions');
  };

  const handleStartEditDifficulty = () => {
    if (!question) return;
    setSelectedDifficulty(question.difficulty);
    setDifficultyRemark('');
    setIsEditingDifficulty(true);
    setShowDifficultyDropdown(false);
  };

  const handleSaveDifficulty = () => {
    if (!question) return;
    updateQuestionDifficulty(question.id, selectedDifficulty, difficultyRemark);
    setIsEditingDifficulty(false);
    setDifficultyRemark('');
  };

  const handleCancelEditDifficulty = () => {
    setIsEditingDifficulty(false);
    setDifficultyRemark('');
  };

  const handleStartEditTags = () => {
    if (!question) return;
    setSelectedTagIds([...question.tags]);
    setTagSearchQuery('');
    setIsEditingTags(true);
  };

  const handleSaveTags = () => {
    if (!question) return;
    updateQuestionTags(question.id, selectedTagIds);
    setIsEditingTags(false);
    setTagSearchQuery('');
  };

  const handleCancelEditTags = () => {
    setIsEditingTags(false);
    setTagSearchQuery('');
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const filteredAvailableTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return knowledgeTags;
    const query = tagSearchQuery.toLowerCase();
    return knowledgeTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(query) ||
        getCategoryLabel(tag.category).toLowerCase().includes(query) ||
        tag.description.toLowerCase().includes(query)
    );
  }, [knowledgeTags, tagSearchQuery]);

  const sortedChangeHistory = useMemo(() => {
    if (!question) return [];
    return [...question.changeHistory].sort((a, b) => b.timestamp - a.timestamp);
  }, [question]);

  const sortedAnswerRecords = useMemo(() => {
    if (!question) return [];
    return [...question.answerRecords].sort((a, b) => b.answerTime - a.answerTime);
  }, [question]);

  const studentOtherAnswers = useMemo(() => {
    if (!selectedStudentId) return [];
    return questions
      .flatMap((q) => q.answerRecords)
      .filter((r) => r.studentId === selectedStudentId && r.questionId !== selectedQuestionId)
      .sort((a, b) => b.answerTime - a.answerTime);
  }, [selectedStudentId, questions, selectedQuestionId]);

  const actualCorrectRate = question ? calculateCorrectRate(question) : 0;

  const getFieldLabel = (field: ChangeRecord['field']): string => {
    const labels: Record<ChangeRecord['field'], string> = {
      difficulty: '难度等级',
      tags: '知识点标签',
      answer: '正确答案',
      status: '题目状态',
    };
    return labels[field];
  };

  const getFieldChangeDisplay = (record: ChangeRecord): { old: string; new: string } => {
    if (record.field === 'difficulty') {
      return {
        old: getDifficultyLabel(record.oldValue as DifficultyLevel),
        new: getDifficultyLabel(record.newValue as DifficultyLevel),
      };
    }
    if (record.field === 'tags') {
      const getTagNames = (ids: string) =>
        ids
          .split(',')
          .filter(Boolean)
          .map((id) => knowledgeTags.find((t) => t.id === id)?.name || id)
          .join('、') || '无';
      return {
        old: getTagNames(record.oldValue),
        new: getTagNames(record.newValue),
      };
    }
    return { old: record.oldValue, new: record.newValue };
  };

  const handleResolveDrift = (action: 'keep' | 'adjust') => {
    if (!drift) return;
    if (action === 'adjust') {
      const newDifficulty: DifficultyLevel =
        drift.actualDifficulty > 0.8 ? 'easy' : drift.actualDifficulty > 0.5 ? 'medium' : 'hard';
      resolveDrift(drift.id, 'adjust', newDifficulty);
    } else {
      resolveDrift(drift.id, 'keep');
    }
    setShowDriftActions(false);
  };

  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-slate-400 text-lg">题目不存在或已被删除</div>
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回列表</span>
        </button>
        <div className="h-6 w-px bg-slate-300" />
        <h1 className="text-2xl font-bold text-slate-800">题目详情</h1>
        {drift && (
          <span className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-sm font-medium animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            难度漂移预警
          </span>
        )}
      </div>

      {drift && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-2xl p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 text-lg mb-1">检测到难度漂移</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">预期难度</p>
                  <div className="flex items-center gap-2">
                    <DifficultyBadge difficulty={drift.expectedDifficulty} />
                    <span className="text-sm text-slate-600">
                      正确率 {drift.expectedDifficulty === 'easy' ? '80%+' : drift.expectedDifficulty === 'medium' ? '50%-80%' : '20%-50%'}
                    </span>
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">实际正确率</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {Math.round(drift.actualDifficulty * 100)}%
                  </p>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">漂移程度</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          drift.driftScore > 0.4
                            ? 'bg-rose-500'
                            : drift.driftScore > 0.2
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        )}
                        style={{ width: `${drift.driftScore * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {Math.round(drift.driftScore * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              {drift.assignee && (
                <p className="text-sm text-slate-600 mt-3">
                  <span className="text-slate-500">处理人：</span>
                  {drift.assignee}
                </p>
              )}
              <div className="mt-4 flex items-center gap-3">
                {!showDriftActions ? (
                  <button
                    onClick={() => setShowDriftActions(true)}
                    className="px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors font-medium shadow-md"
                  >
                    处理漂移预警
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleResolveDrift('adjust')}
                      className="px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors font-medium shadow-md"
                    >
                      调整难度
                    </button>
                    <button
                      onClick={() => handleResolveDrift('keep')}
                      className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                    >
                      保持原难度
                    </button>
                    <button
                      onClick={() => setShowDriftActions(false)}
                      className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      取消
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <DifficultyBadge difficulty={question.difficulty} />
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                        question.tagStatus === 'confirmed'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : question.tagStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      )}
                    >
                      {question.tagStatus === 'confirmed'
                        ? '标签已确认'
                        : question.tagStatus === 'pending'
                        ? '标签待确认'
                        : '缺少标签'}
                    </span>
                    <span className="text-xs text-slate-400">
                      正确率 {Math.round(actualCorrectRate * 100)}% · {question.answerRecords.length} 次答题
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-800 leading-relaxed">
                    {question.title}
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
              <p className="text-sm text-slate-500 mb-3">音频播放</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg',
                    isPlaying
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30 scale-105'
                      : 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/30 hover:scale-105'
                  )}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          isPlaying
                            ? 'bg-gradient-to-r from-amber-400 to-amber-600 w-3/4'
                            : 'bg-slate-300 w-0'
                        )}
                        style={{
                          animation: isPlaying ? 'progress 8s linear infinite' : 'none',
                        }}
                      />
                    </div>
                    <span className="text-sm text-slate-500 font-mono">
                      {question.audioDuration}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-1 bg-slate-300 rounded-full transition-all duration-200',
                          isPlaying && 'bg-amber-400'
                        )}
                        style={{
                          height: isPlaying ? `${12 + Math.random() * 12}px` : '8px',
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                    <span className="text-xs text-slate-400 ml-2">
                      {isPlaying ? '正在播放...' : '点击播放音频'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-500 mb-3">正确答案</p>
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-emerald-800 font-semibold text-lg">
                  {question.correctAnswer}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">难度设置</h3>
                <p className="text-sm text-slate-500 mt-1">调整题目的难度等级</p>
              </div>
              {!isEditingDifficulty && (
                <button
                  onClick={handleStartEditDifficulty}
                  className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  修改难度
                </button>
              )}
            </div>
            <div className="p-6">
              {!isEditingDifficulty ? (
                <div className="flex items-center gap-4">
                  <DifficultyBadge difficulty={question.difficulty} className="text-sm px-4 py-2" />
                  <div>
                    <p className="text-slate-700 font-medium">
                      {getDifficultyLabel(question.difficulty)}
                    </p>
                    <p className="text-xs text-slate-500">
                      预期正确率范围：
                      {question.difficulty === 'easy'
                        ? '80% - 100%'
                        : question.difficulty === 'medium'
                        ? '50% - 80%'
                        : '20% - 50%'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      选择难度
                    </label>
                    <button
                      onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                      className="w-full flex items-center justify-between px-4 py-3 border border-slate-300 rounded-xl hover:border-indigo-400 transition-colors bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <DifficultyBadge difficulty={selectedDifficulty} />
                        <span className="text-slate-700 font-medium">
                          {getDifficultyLabel(selectedDifficulty)}
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-5 h-5 text-slate-400 transition-transform',
                          showDifficultyDropdown && 'rotate-180'
                        )}
                      />
                    </button>
                    {showDifficultyDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                        {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((diff) => (
                          <button
                            key={diff}
                            onClick={() => {
                              setSelectedDifficulty(diff);
                              setShowDifficultyDropdown(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left',
                              selectedDifficulty === diff && 'bg-indigo-50'
                            )}
                          >
                            <DifficultyBadge difficulty={diff} />
                            <div>
                              <p className="text-slate-700 font-medium">
                                {getDifficultyLabel(diff)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {diff === 'easy'
                                  ? '简单，正确率 80%+'
                                  : diff === 'medium'
                                  ? '中等，正确率 50%-80%'
                                  : '困难，正确率 20%-50%'}
                              </p>
                            </div>
                            {selectedDifficulty === diff && (
                              <Check className="w-5 h-5 text-indigo-500 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      变更备注
                    </label>
                    <textarea
                      value={difficultyRemark}
                      onChange={(e) => setDifficultyRemark(e.target.value)}
                      placeholder="请输入调整难度的原因（选填）"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveDifficulty}
                      className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors font-medium shadow-md"
                    >
                      保存修改
                    </button>
                    <button
                      onClick={handleCancelEditDifficulty}
                      className="px-6 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">知识点标签</h3>
                <p className="text-sm text-slate-500 mt-1">
                  管理题目关联的知识点，修改后将进入待确认状态
                </p>
              </div>
              {!isEditingTags && (
                <button
                  onClick={handleStartEditTags}
                  className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  编辑标签
                </button>
              )}
            </div>
            <div className="p-6">
              {!isEditingTags ? (
                <div>
                  {currentTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {currentTags.map((tag) => (
                        <TagBadge key={tag.id} tag={tag} className="text-sm px-3 py-1.5" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-400">
                      <TagBadge
                        tag={{
                          id: 'empty',
                          category: 'rhythm',
                          name: '暂无标签',
                          description: '',
                        }}
                        className="opacity-50"
                      />
                      <span>该题目尚未关联任何知识点标签</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      placeholder="搜索知识点标签..."
                      className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 max-h-64 overflow-y-auto">
                    {filteredAvailableTags.length > 0 ? (
                      <div className="space-y-2">
                        {filteredAvailableTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                              selectedTagIds.includes(tag.id)
                                ? 'bg-indigo-50 border-2 border-indigo-200'
                                : 'hover:bg-slate-50 border-2 border-transparent'
                            )}
                          >
                            <div
                              className={cn(
                                'w-5 h-5 rounded-md flex items-center justify-center transition-all',
                                selectedTagIds.includes(tag.id)
                                  ? 'bg-indigo-500'
                                  : 'border-2 border-slate-300'
                              )}
                            >
                              {selectedTagIds.includes(tag.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <TagBadge tag={tag} />
                              </div>
                              <p className="text-xs text-slate-500 mt-1 truncate">
                                {tag.description}
                              </p>
                            </div>
                            {selectedTagIds.includes(tag.id) && (
                              <Plus className="w-4 h-4 text-indigo-500 rotate-45" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>未找到匹配的知识点标签</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      已选择 <span className="font-semibold text-indigo-600">{selectedTagIds.length}</span> 个标签
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveTags}
                        className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors font-medium shadow-md"
                      >
                        保存标签
                      </button>
                      <button
                        onClick={handleCancelEditTags}
                        className="px-6 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">复核历史</h3>
                  <p className="text-sm text-slate-500">
                    共 {sortedChangeHistory.length} 条变更记录
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {sortedChangeHistory.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-200 via-amber-200 to-rose-200" />
                  <div className="space-y-6">
                    {sortedChangeHistory.map((record, index) => {
                      const display = getFieldChangeDisplay(record);
                      return (
                        <div
                          key={record.id}
                          className="relative pl-10 group"
                          style={{
                            animation: `slideInLeft 0.4s ease-out ${index * 0.1}s both`,
                          }}
                        >
                          <div className="absolute left-2 w-5 h-5 bg-white border-4 border-indigo-400 rounded-full shadow-md group-hover:scale-125 transition-transform" />
                          <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:translate-x-1">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                <MessageSquare className="w-3 h-3" />
                                {getFieldLabel(record.field)}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDateTime(record.timestamp)}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-500">变更前：</span>
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-medium line-through">
                                  {display.old}
                                </span>
                                <X className="w-4 h-4 text-rose-400" />
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                  {display.new}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100">
                                <User className="w-3 h-3" />
                                <span className="font-medium text-slate-600">{record.operator}</span>
                                {record.remark && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-slate-500">{record.remark}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500">暂无变更记录</p>
                  <p className="text-xs text-slate-400 mt-1">修改题目信息后将在此处显示</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">答题历史</h3>
                    <p className="text-sm text-slate-500">
                      共 {sortedAnswerRecords.length} 条答题记录
                    </p>
                  </div>
                </div>
                {selectedStudentId && (
                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Filter className="w-3 h-3" />
                    清除筛选
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {sortedAnswerRecords.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {sortedAnswerRecords.map((record, index) => (
                    <div
                      key={record.id}
                      onClick={() => setSelectedStudentId(record.studentId)}
                      className={cn(
                        'p-4 hover:bg-slate-50 transition-all duration-200 cursor-pointer',
                        selectedStudentId === record.studentId && 'bg-indigo-50/50',
                        index % 2 === 0 && 'bg-white',
                        index % 2 === 1 && 'bg-slate-50/50'
                      )}
                      style={{
                        animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                            record.isCorrect
                              ? 'bg-emerald-100'
                              : 'bg-rose-100'
                          )}
                        >
                          {record.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-800">{record.studentName}</p>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(record.answerTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span
                              className={cn(
                                'text-xs font-medium',
                                record.isCorrect ? 'text-emerald-600' : 'text-rose-600'
                              )}
                            >
                              {record.isCorrect ? '回答正确' : '回答错误'}
                            </span>
                            {record.score !== undefined && (
                              <span className="text-xs text-slate-500">
                                得分：{record.score} 分
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedStudentId === record.studentId && studentOtherAnswers.length > 0 && (
                        <div className="mt-4 ml-13 pl-4 border-l-2 border-indigo-200 space-y-3">
                          <p className="text-xs font-medium text-indigo-600 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            该学生的其他答题记录（{studentOtherAnswers.length}条）
                          </p>
                          {studentOtherAnswers.slice(0, 3).map((other) => {
                            const q = questions.find((qq) => qq.id === other.questionId);
                            return (
                              <div
                                key={other.id}
                                className="bg-white rounded-lg p-3 border border-slate-200"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {other.isCorrect ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                  )}
                                  <span className="text-sm text-slate-700 truncate flex-1">
                                    {q?.title || '未知题目'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <DifficultyBadge
                                    difficulty={q?.difficulty || 'easy'}
                                    className="text-[10px] px-1.5 py-0.5"
                                  />
                                  <span>{formatDateTime(other.answerTime)}</span>
                                  {other.score !== undefined && (
                                    <span>· {other.score} 分</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {studentOtherAnswers.length > 3 && (
                            <p className="text-xs text-slate-400 text-center">
                              还有 {studentOtherAnswers.length - 3} 条记录...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500">暂无答题记录</p>
                  <p className="text-xs text-slate-400 mt-1">学生作答后将在此处显示</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
