import { useState, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  Download,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
  Check,
  AlertCircle,
  XCircle,
  MoreHorizontal,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import DifficultyBadge from '../components/DifficultyBadge';
import TagBadge from '../components/TagBadge';
import Empty from '../components/Empty';
import {
  getCategoryLabel,
  calculateCorrectRate,
  getTagStatusColor,
} from '../utils/algorithms';
import { exportQuestionsToXLSX } from '../utils/export';
import { cn } from '../lib/utils';
import type {
  KnowledgeCategory,
  DifficultyLevel,
  TagStatus,
  QuestionStatus,
  Question,
} from '../types';

const CATEGORY_OPTIONS: KnowledgeCategory[] = [
  'rhythm',
  'harmony',
  'melody',
  'interval',
  'chord',
];

const DIFFICULTY_OPTIONS: DifficultyLevel[] = ['easy', 'medium', 'hard'];

const TAG_STATUS_OPTIONS: TagStatus[] = ['confirmed', 'pending', 'missing'];

const QUESTION_STATUS_OPTIONS: QuestionStatus[] = [
  'active',
  'pending_review',
  'duplicate',
  'deprecated',
];

const TAG_STATUS_LABELS: Record<TagStatus, string> = {
  confirmed: '已确认',
  pending: '待确认',
  missing: '缺失',
};

const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  active: '启用',
  pending_review: '待复核',
  duplicate: '重复',
  deprecated: '已废弃',
};

const QUESTION_STATUS_COLORS: Record<QuestionStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending_review: 'bg-amber-100 text-amber-700 border-amber-200',
  duplicate: 'bg-rose-100 text-rose-700 border-rose-200',
  deprecated: 'bg-slate-100 text-slate-500 border-slate-200',
};

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function FilterSection({ title, icon, children }: FilterSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2 pl-1">{children}</div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  color?: string;
}

function FilterChip({ label, checked, onChange, color }: FilterChipProps) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border',
        checked
          ? color || 'bg-indigo-500 text-white border-indigo-500 shadow-md'
          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
      )}
    >
      {checked ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Square className="w-3.5 h-3.5 opacity-50" />
      )}
      {label}
    </button>
  );
}

export default function QuestionList() {
  const {
    questions,
    knowledgeTags,
    filters,
    selectedQuestionIds,
    getFilteredQuestions,
    getTagsForQuestion,
    setFilters,
    toggleQuestionSelection,
    clearSelection,
    selectAll,
    setCurrentPage,
    setSelectedQuestionId,
  } = useStore();

  const [showBatchMenu, setShowBatchMenu] = useState(false);

  const filteredQuestions = useMemo(() => {
    return getFilteredQuestions();
  }, [getFilteredQuestions]);

  const allSelected = useMemo(() => {
    if (filteredQuestions.length === 0) return false;
    return filteredQuestions.every((q) => selectedQuestionIds.includes(q.id));
  }, [filteredQuestions, selectedQuestionIds]);

  const someSelected = useMemo(() => {
    return filteredQuestions.some((q) => selectedQuestionIds.includes(q.id));
  }, [filteredQuestions, selectedQuestionIds]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search ||
      filters.categories.length > 0 ||
      filters.difficulties.length > 0 ||
      filters.tagStatus.length > 0 ||
      filters.status.length > 0
    );
  }, [filters]);

  const handleToggleCategory = (category: KnowledgeCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    setFilters({ categories: newCategories });
  };

  const handleToggleDifficulty = (difficulty: DifficultyLevel) => {
    const newDifficulties = filters.difficulties.includes(difficulty)
      ? filters.difficulties.filter((d) => d !== difficulty)
      : [...filters.difficulties, difficulty];
    setFilters({ difficulties: newDifficulties });
  };

  const handleToggleTagStatus = (status: TagStatus) => {
    const newStatus = filters.tagStatus.includes(status)
      ? filters.tagStatus.filter((s) => s !== status)
      : [...filters.tagStatus, status];
    setFilters({ tagStatus: newStatus });
  };

  const handleToggleQuestionStatus = (status: QuestionStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    setFilters({ status: newStatus });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(filteredQuestions.map((q) => q.id));
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      categories: [],
      difficulties: [],
      tagStatus: [],
      status: [],
    });
  };

  const handleExport = () => {
    const questionsToExport =
      selectedQuestionIds.length > 0
        ? questions.filter((q) => selectedQuestionIds.includes(q.id))
        : filteredQuestions;
    exportQuestionsToXLSX(questionsToExport, knowledgeTags);
  };

  const handleRowClick = (question: Question) => {
    setSelectedQuestionId(question.id);
    setCurrentPage('question-detail');
  };

  const getCorrectRateDisplay = (question: Question) => {
    const rate = calculateCorrectRate(question);
    return Math.round(rate * 100);
  };

  const getCorrectRateColor = (rate: number) => {
    if (rate >= 70) return 'text-emerald-600';
    if (rate >= 40) return 'text-amber-600';
    return 'text-rose-600';
  };

  const categoryColors: Record<KnowledgeCategory, string> = {
    rhythm: 'bg-purple-500 text-white border-purple-500',
    harmony: 'bg-blue-500 text-white border-blue-500',
    melody: 'bg-green-500 text-white border-green-500',
    interval: 'bg-orange-500 text-white border-orange-500',
    chord: 'bg-pink-500 text-white border-pink-500',
  };

  return (
    <div className="flex h-full gap-6 animate-fadeIn">
      <aside className="w-72 flex-shrink-0 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-500" />
              筛选条件
            </h2>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-slate-500 hover:text-rose-500 flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                清除
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索题目标题..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          <FilterSection title="知识点分类" icon={<AlertCircle className="w-4 h-4 text-purple-500" />}>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <FilterChip
                  key={cat}
                  label={getCategoryLabel(cat)}
                  checked={filters.categories.includes(cat)}
                  onChange={() => handleToggleCategory(cat)}
                  color={categoryColors[cat]}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="难度等级" icon={<AlertCircle className="w-4 h-4 text-amber-500" />}>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_OPTIONS.map((diff) => (
                <FilterChip
                  key={diff}
                  label={diff === 'easy' ? '易' : diff === 'medium' ? '中' : '难'}
                  checked={filters.difficulties.includes(diff)}
                  onChange={() => handleToggleDifficulty(diff)}
                  color={
                    diff === 'easy'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : diff === 'medium'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-rose-500 text-white border-rose-500'
                  }
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="标签状态" icon={<CheckSquare className="w-4 h-4 text-blue-500" />}>
            <div className="flex flex-wrap gap-2">
              {TAG_STATUS_OPTIONS.map((status) => (
                <FilterChip
                  key={status}
                  label={TAG_STATUS_LABELS[status]}
                  checked={filters.tagStatus.includes(status)}
                  onChange={() => handleToggleTagStatus(status)}
                  color={
                    status === 'confirmed'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : status === 'pending'
                      ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'bg-red-500 text-white border-red-500'
                  }
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="题目状态" icon={<AlertCircle className="w-4 h-4 text-emerald-500" />}>
            <div className="flex flex-wrap gap-2">
              {QUESTION_STATUS_OPTIONS.map((status) => (
                <FilterChip
                  key={status}
                  label={QUESTION_STATUS_LABELS[status]}
                  checked={filters.status.includes(status)}
                  onChange={() => handleToggleQuestionStatus(status)}
                />
              ))}
            </div>
          </FilterSection>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-90">当前筛选结果</p>
          <p className="text-3xl font-bold mt-1">{filteredQuestions.length}</p>
          <p className="text-sm opacity-75 mt-1">道题目</p>
          {selectedQuestionIds.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm opacity-90">已选择</p>
              <p className="text-xl font-bold">{selectedQuestionIds.length} 道</p>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={handleSelectAll}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    allSelected
                      ? 'bg-indigo-500 border-indigo-500'
                      : someSelected
                      ? 'bg-indigo-200 border-indigo-400'
                      : 'border-slate-300 hover:border-indigo-400'
                  )}
                >
                  {(allSelected || someSelected) && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
              </div>
              <span className="text-sm text-slate-600">
                共 <span className="font-semibold text-slate-800">{filteredQuestions.length}</span> 道题目
              </span>
              {selectedQuestionIds.length > 0 && (
                <span className="text-sm text-indigo-600 font-medium">
                  已选 {selectedQuestionIds.length} 道
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedQuestionIds.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowBatchMenu(!showBatchMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    批量操作
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {showBatchMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-scaleIn">
                      <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <Edit className="w-4 h-4" />
                        批量编辑
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <Download className="w-4 h-4" />
                        导出选中
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                      <button
                        onClick={clearSelection}
                        className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        取消选择
                      </button>
                    </div>
                  )}
                </div>
              )}

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  清除筛选
                </button>
              )}

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg"
              >
                <Download className="w-4 h-4" />
                {selectedQuestionIds.length > 0 ? '导出选中' : '导出全部'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex flex-col">
          {filteredQuestions.length === 0 ? (
            <Empty
              title="暂无匹配的题目"
              description="尝试调整筛选条件或清除筛选"
              action={
                hasActiveFilters ? (
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    清除筛选条件
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <span className="sr-only">选择</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      题目标题
                    </th>
                    <th className="w-24 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      难度
                    </th>
                    <th className="w-48 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      知识点
                    </th>
                    <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      标签状态
                    </th>
                    <th className="w-24 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      正确率
                    </th>
                    <th className="w-32 px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuestions.map((question, index) => {
                    const isSelected = selectedQuestionIds.includes(question.id);
                    const questionTags = getTagsForQuestion(question.id);
                    const correctRate = getCorrectRateDisplay(question);

                    return (
                      <tr
                        key={question.id}
                        onClick={() => handleRowClick(question)}
                        className={cn(
                          'transition-all duration-200 cursor-pointer group',
                          isSelected
                            ? 'bg-indigo-50/60'
                            : 'hover:bg-slate-50',
                          question.status === 'deprecated' && 'opacity-60'
                        )}
                        style={{
                          animation: `slideIn 0.3s ease-out ${index * 30}ms both`,
                        }}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleQuestionSelection(question.id)}
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                              isSelected
                                ? 'bg-indigo-500 border-indigo-500'
                                : 'border-slate-300 group-hover:border-indigo-400'
                            )}
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                {question.title}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                ID: {question.id} · 创建于{' '}
                                {new Date(question.createdAt).toLocaleDateString(
                                  'zh-CN'
                                )}
                              </p>
                            </div>
                            {question.status !== 'active' && (
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                                  QUESTION_STATUS_COLORS[question.status]
                                )}
                              >
                                {QUESTION_STATUS_LABELS[question.status]}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <DifficultyBadge difficulty={question.difficulty} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {questionTags.slice(0, 2).map((tag) => (
                              <TagBadge key={tag.id} tag={tag} />
                            ))}
                            {questionTags.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                +{questionTags.length - 2}
                              </span>
                            )}
                            {questionTags.length === 0 && (
                              <span className="text-xs text-slate-400">无标签</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border',
                              getTagStatusColor(question.tagStatus)
                            )}
                          >
                            {question.tagStatus === 'confirmed' ? (
                              <Check className="w-3 h-3" />
                            ) : question.tagStatus === 'pending' ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {TAG_STATUS_LABELS[question.tagStatus]}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  correctRate >= 70
                                    ? 'bg-emerald-400'
                                    : correctRate >= 40
                                    ? 'bg-amber-400'
                                    : 'bg-rose-400'
                                )}
                                style={{ width: `${correctRate}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                'text-sm font-semibold tabular-nums',
                                getCorrectRateColor(correctRate)
                              )}
                            >
                              {correctRate}%
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleRowClick(question)}
                              className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                              title="编辑"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
