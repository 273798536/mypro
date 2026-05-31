import { useState, useMemo } from 'react';
import {
  FileText,
  Shuffle,
  Download,
  RefreshCw,
  Play,
  Target,
  PieChart as PieChartIcon,
  Radar as RadarIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { useStore } from '../store/useStore';
import DifficultyBadge from '../components/DifficultyBadge';
import TagBadge from '../components/TagBadge';
import {
  getCategoryLabel,
  getDifficultyLabel,
} from '../utils/algorithms';
import { exportExamToXLSX, exportExamToPDF } from '../utils/export';
import type {
  KnowledgeCategory,
  DifficultyLevel,
  ExamPaper,
  ExamStrategy,
} from '../types';

const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  'rhythm',
  'harmony',
  'melody',
  'interval',
  'chord',
];

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444',
};

const CATEGORY_COLORS: Record<KnowledgeCategory, string> = {
  rhythm: '#8b5cf6',
  harmony: '#3b82f6',
  melody: '#10b981',
  interval: '#f59e0b',
  chord: '#ec4899',
};

export default function ExamGenerator() {
  const { questions, knowledgeTags, generateExamPaper } = useStore();

  const [examName, setExamName] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [difficultyDistribution, setDifficultyDistribution] = useState({
    easy: 30,
    medium: 50,
    hard: 20,
  });
  const [categoryDistribution, setCategoryDistribution] = useState<
    Record<KnowledgeCategory, number>
  >({
    rhythm: 20,
    harmony: 20,
    melody: 20,
    interval: 20,
    chord: 20,
  });
  const [currentExam, setCurrentExam] = useState<ExamPaper | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableQuestions = useMemo(
    () => questions.filter((q) => q.status === 'active'),
    [questions]
  );

  const balanceScore = useMemo(() => {
    let score = 100;

    const diffSum =
      difficultyDistribution.easy +
      difficultyDistribution.medium +
      difficultyDistribution.hard;
    if (diffSum !== 100) {
      score -= Math.abs(diffSum - 100) * 2;
    }

    const catSum = Object.values(categoryDistribution).reduce(
      (a, b) => a + b,
      0
    );
    if (catSum !== 100) {
      score -= Math.abs(catSum - 100) * 2;
    }

    const difficultyScore = Math.min(
      difficultyDistribution.easy,
      difficultyDistribution.medium,
      difficultyDistribution.hard
    );
    if (difficultyScore < 10) {
      score -= (10 - difficultyScore) * 1.5;
    }

    const categoryScores = Object.values(categoryDistribution);
    const minCategory = Math.min(...categoryScores);
    if (minCategory < 5) {
      score -= (5 - minCategory) * 2;
    }

    const maxDifficulty = Math.max(
      difficultyDistribution.easy,
      difficultyDistribution.medium,
      difficultyDistribution.hard
    );
    if (maxDifficulty > 70) {
      score -= (maxDifficulty - 70) * 0.5;
    }

    const maxCategory = Math.max(...categoryScores);
    if (maxCategory > 40) {
      score -= (maxCategory - 40) * 0.5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [difficultyDistribution, categoryDistribution]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-emerald-600';
    if (score >= 60) return 'from-amber-500 to-amber-600';
    return 'from-rose-500 to-rose-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 60) return '一般';
    return '需调整';
  };

  const handleDifficultyChange = (
    level: DifficultyLevel,
    value: number
  ) => {
    const newDist = { ...difficultyDistribution, [level]: value };
    const total = newDist.easy + newDist.medium + newDist.hard;

    if (total > 100) {
      const others = (['easy', 'medium', 'hard'] as DifficultyLevel[]).filter(
        (d) => d !== level
      );
      const excess = total - 100;
      const otherTotal = others.reduce((sum, d) => sum + newDist[d], 0);

      if (otherTotal >= excess) {
        others.forEach((d) => {
          const ratio = newDist[d] / otherTotal;
          newDist[d] = Math.max(0, Math.round(newDist[d] - excess * ratio));
        });
      } else {
        others.forEach((d) => {
          newDist[d] = 0;
        });
        newDist[level] = 100;
      }
    }

    setDifficultyDistribution(newDist);
  };

  const handleCategoryChange = (
    category: KnowledgeCategory,
    value: number
  ) => {
    const newDist = { ...categoryDistribution, [category]: value };
    const total = Object.values(newDist).reduce((a, b) => a + b, 0);

    if (total > 100) {
      const others = KNOWLEDGE_CATEGORIES.filter((c) => c !== category);
      const excess = total - 100;
      const otherTotal = others.reduce((sum, c) => sum + newDist[c], 0);

      if (otherTotal >= excess) {
        others.forEach((c) => {
          const ratio = newDist[c] / otherTotal;
          newDist[c] = Math.max(0, Math.round(newDist[c] - excess * ratio));
        });
      } else {
        others.forEach((c) => {
          newDist[c] = 0;
        });
        newDist[category] = 100;
      }
    }

    setCategoryDistribution(newDist);
  };

  const handleGenerateExam = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const strategy: Omit<ExamStrategy, 'id'> = {
        name: examName || `智能试卷-${new Date().toLocaleDateString('zh-CN')}`,
        totalQuestions,
        difficultyDistribution: {
          easy: difficultyDistribution.easy / 100,
          medium: difficultyDistribution.medium / 100,
          hard: difficultyDistribution.hard / 100,
        },
        categoryDistribution: {
          rhythm: categoryDistribution.rhythm / 100,
          harmony: categoryDistribution.harmony / 100,
          melody: categoryDistribution.melody / 100,
          interval: categoryDistribution.interval / 100,
          chord: categoryDistribution.chord / 100,
        },
        excludeQuestionIds: [],
      };

      const exam = generateExamPaper(strategy);
      setCurrentExam(exam);
      setIsGenerating(false);
    }, 800);
  };

  const handleRegenerateExam = () => {
    if (currentExam) {
      handleGenerateExam();
    }
  };

  const handleExportXLSX = () => {
    if (currentExam) {
      exportExamToXLSX(currentExam, knowledgeTags);
    }
  };

  const handleExportPDF = () => {
    if (currentExam) {
      exportExamToPDF(currentExam, knowledgeTags);
    }
  };

  const difficultySum =
    difficultyDistribution.easy +
    difficultyDistribution.medium +
    difficultyDistribution.hard;
  const categorySum = Object.values(categoryDistribution).reduce(
    (a, b) => a + b,
    0
  );

  const difficultyPieData = useMemo(() => {
    if (!currentExam) return [];
    const counts: Record<DifficultyLevel, number> = { easy: 0, medium: 0, hard: 0 };
    currentExam.questions.forEach((q) => {
      counts[q.difficulty]++;
    });
    return [
      {
        name: getDifficultyLabel('easy'),
        value: counts.easy,
        color: DIFFICULTY_COLORS.easy,
      },
      {
        name: getDifficultyLabel('medium'),
        value: counts.medium,
        color: DIFFICULTY_COLORS.medium,
      },
      {
        name: getDifficultyLabel('hard'),
        value: counts.hard,
        color: DIFFICULTY_COLORS.hard,
      },
    ];
  }, [currentExam]);

  const categoryRadarData = useMemo(() => {
    if (!currentExam) return [];
    const counts: Record<KnowledgeCategory, number> = {
      rhythm: 0,
      harmony: 0,
      melody: 0,
      interval: 0,
      chord: 0,
    };
    currentExam.questions.forEach((q) => {
      q.tags.forEach((t) => {
        const tag = knowledgeTags.find((kt) => kt.id === t);
        if (tag) counts[tag.category]++;
      });
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return KNOWLEDGE_CATEGORIES.map((cat) => ({
      category: getCategoryLabel(cat),
      actual: Math.round((counts[cat] / total) * 100),
      target: Math.round(categoryDistribution[cat]),
      fullMark: 100,
    }));
  }, [currentExam, knowledgeTags, categoryDistribution]);

  const availableCounts = useMemo(() => {
    const counts: Record<DifficultyLevel, number> = { easy: 0, medium: 0, hard: 0 };
    availableQuestions.forEach((q) => {
      counts[q.difficulty]++;
    });
    return counts;
  }, [availableQuestions]);

  const canGenerate =
    availableQuestions.length >= totalQuestions &&
    difficultySum === 100 &&
    categorySum === 100 &&
    balanceScore >= 60;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-indigo-500" />
            智能抽题
          </h1>
          <p className="text-slate-500 mt-1">
            根据策略智能组卷，确保难度和知识点分布平衡
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            可用题目: <span className="font-semibold text-indigo-600">{availableQuestions.length}</span> 道
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              策略配置
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  试卷名称
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="请输入试卷名称（可选）"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">
                    题目数量
                  </label>
                  <span className="text-2xl font-bold text-indigo-600">
                    {totalQuestions}
                    <span className="text-sm font-normal text-slate-400 ml-1">
                      道
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max={Math.min(100, availableQuestions.length)}
                  step="1"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>5</span>
                  <span>{Math.min(100, availableQuestions.length)}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">
                    难度分布
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        difficultySum === 100
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {difficultySum}%
                    </span>
                    {difficultySum === 100 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map(
                    (level) => (
                      <div key={level} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-sm font-medium"
                            style={{
                              color:
                                DIFFICULTY_COLORS[level],
                            }}
                          >
                            {getDifficultyLabel(level)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">
                              {difficultyDistribution[level]}%
                            </span>
                            <span className="text-xs text-slate-400">
                              (库存: {availableCounts[level]})
                            </span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={difficultyDistribution[level]}
                          onChange={(e) =>
                            handleDifficultyChange(
                              level,
                              Number(e.target.value)
                            )
                          }
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          style={{
                            accentColor: DIFFICULTY_COLORS[level],
                          }}
                        />
                      </div>
                    )
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">
                    知识点分布
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        categorySum === 100
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {categorySum}%
                    </span>
                    {categorySum === 100 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: CATEGORY_COLORS[cat],
                          }}
                        >
                          {getCategoryLabel(cat)}
                        </span>
                        <span className="text-sm text-slate-600">
                          {categoryDistribution[cat]}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={categoryDistribution[cat]}
                        onChange={(e) =>
                          handleCategoryChange(
                            cat,
                            Number(e.target.value)
                          )
                        }
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          accentColor: CATEGORY_COLORS[cat],
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleGenerateExam}
                disabled={!canGenerate || isGenerating}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    正在抽题...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    开始抽题
                  </>
                )}
              </button>
              {currentExam && (
                <button
                  onClick={handleRegenerateExam}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  <Shuffle className="w-5 h-5" />
                  重新抽题
                </button>
              )}
            </div>

            {!canGenerate && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700">
                    {availableQuestions.length < totalQuestions && (
                      <p>• 可用题目数量不足（需要 {totalQuestions} 道，当前 {availableQuestions.length} 道）</p>
                    )}
                    {difficultySum !== 100 && (
                      <p>• 难度分布总和必须为 100%（当前 {difficultySum}%）</p>
                    )}
                    {categorySum !== 100 && (
                      <p>• 知识点分布总和必须为 100%（当前 {categorySum}%）</p>
                    )}
                    {balanceScore < 60 && (
                      <p>• 平衡度过低（当前 {balanceScore} 分，需要 ≥60 分），请调整分布策略</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {currentExam && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  抽题结果 - {currentExam.name}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportXLSX}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    导出 Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg font-medium hover:bg-rose-100 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    导出 PDF
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {currentExam.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm font-medium text-slate-800 leading-relaxed">
                            {q.title}
                          </p>
                          <DifficultyBadge difficulty={q.difficulty} />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {q.tags.map((t) => {
                            const tag = knowledgeTags.find(
                              (kt) => kt.id === t
                            );
                            return tag ? (
                              <TagBadge key={t} tag={tag} />
                            ) : null;
                          })}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span>选项: {q.options.length} 个</span>
                          <span>音频: {q.audioDuration}秒</span>
                          {q.correctRate !== undefined && (
                            <span>
                              正确率: {Math.round(q.correctRate * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              平衡度评分
            </h2>
            <div className="relative flex flex-col items-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${balanceScore * 5.02} 502`}
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop
                        offset="0%"
                        stopColor={
                          balanceScore >= 80
                            ? '#10b981'
                            : balanceScore >= 60
                            ? '#f59e0b'
                            : '#ef4444'
                        }
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          balanceScore >= 80
                            ? '#059669'
                            : balanceScore >= 60
                            ? '#d97706'
                            : '#dc2626'
                        }
                      />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`text-5xl font-bold ${getScoreColor(
                      balanceScore
                    )}`}
                  >
                    {balanceScore}
                  </span>
                  <span className="text-sm text-slate-500 mt-1">
                    {getScoreLabel(balanceScore)}
                  </span>
                </div>
              </div>
              <div className="w-full mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">难度分布平衡</span>
                  <span
                    className={
                      difficultySum === 100
                        ? 'text-emerald-500'
                        : 'text-rose-500'
                    }
                  >
                    {difficultySum === 100 ? '正常' : '异常'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">知识点分布平衡</span>
                  <span
                    className={
                      categorySum === 100
                        ? 'text-emerald-500'
                        : 'text-rose-500'
                    }
                  >
                    {categorySum === 100 ? '正常' : '异常'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">题目数量充足</span>
                  <span
                    className={
                      availableQuestions.length >= totalQuestions
                        ? 'text-emerald-500'
                        : 'text-rose-500'
                    }
                  >
                    {availableQuestions.length >= totalQuestions
                      ? '充足'
                      : '不足'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {currentExam && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-indigo-500" />
                  难度分布
                </h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={difficultyPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {difficultyPieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${value} 题`, '数量']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {difficultyPieData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-1.5"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-slate-600">
                        {item.name}: {item.value}题
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <RadarIcon className="w-4 h-4 text-indigo-500" />
                  知识点分布
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={categoryRadarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{
                          fill: '#64748b',
                          fontSize: 12,
                        }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <Radar
                        name="目标"
                        dataKey="target"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <Radar
                        name="实际"
                        dataKey="actual"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, '']}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-indigo-800">
                      组卷完成
                    </p>
                    <p className="text-sm text-indigo-600 mt-1">
                      已成功抽取 {currentExam.questions.length} 道题目，平衡度{' '}
                      <span className="font-bold">
                        {Math.round(currentExam.balanceScore * 100)}
                      </span>{' '}
                      分
                    </p>
                    <p className="text-xs text-indigo-500 mt-2">
                      生成时间:{' '}
                      {new Date(
                        currentExam.createdAt
                      ).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
