import { useMemo } from 'react';
import {
  BookOpen,
  AlertTriangle,
  Tag,
  FileText,
  TrendingUp,
  Music,
  ArrowRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/useStore';
import StatCard from '../components/StatCard';
import { getCategoryLabel, getDifficultyLabel } from '../utils/algorithms';
import type { KnowledgeCategory, DifficultyLevel } from '../types';

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

export default function Dashboard() {
  const { questions, knowledgeTags, difficultyDrifts, duplicateGroups, examPapers, setCurrentPage, setFilters } = useStore();

  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const pendingReview = questions.filter(q => q.tagStatus === 'pending' || q.status === 'pending_review').length;
    const missingTags = questions.filter(q => q.tagStatus === 'missing').length;
    const confirmedTags = questions.filter(q => q.tagStatus === 'confirmed').length;
    const tagCoverage = totalQuestions > 0 ? Math.round((confirmedTags / totalQuestions) * 100) : 0;
    const pendingDrifts = difficultyDrifts.filter(d => d.status === 'pending').length;
    const duplicates = duplicateGroups.filter(g => g.status !== 'resolved').length;
    const thisMonthExams = examPapers.filter(e => {
      const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return e.createdAt > monthAgo;
    }).length;

    return {
      totalQuestions,
      pendingReview,
      missingTags,
      tagCoverage,
      pendingDrifts,
      duplicates,
      thisMonthExams,
    };
  }, [questions, difficultyDrifts, duplicateGroups, examPapers]);

  const difficultyData = useMemo(() => {
    const counts: Record<DifficultyLevel, number> = { easy: 0, medium: 0, hard: 0 };
    questions.forEach(q => { counts[q.difficulty]++; });
    return [
      { name: getDifficultyLabel('easy'), value: counts.easy, color: '#10b981' },
      { name: getDifficultyLabel('medium'), value: counts.medium, color: '#f59e0b' },
      { name: getDifficultyLabel('hard'), value: counts.hard, color: '#ef4444' },
    ];
  }, [questions]);

  const categoryData = useMemo(() => {
    const counts: Record<KnowledgeCategory, number> = {
      rhythm: 0, harmony: 0, melody: 0, interval: 0, chord: 0
    };
    questions.forEach(q => {
      q.tags.forEach(t => {
        const tag = knowledgeTags.find(kt => kt.id === t);
        if (tag) counts[tag.category]++;
      });
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: getCategoryLabel(key as KnowledgeCategory),
      value,
    }));
  }, [questions, knowledgeTags]);

  const recentQuestions = useMemo(() => {
    return [...questions]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);
  }, [questions]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="题目总量"
          value={stats.totalQuestions}
          icon={<BookOpen className="w-6 h-6" />}
          color="indigo"
          trend={{ value: 12, isPositive: true }}
          onClick={() => setCurrentPage('questions')}
        />
        <StatCard
          title="待复核"
          value={stats.pendingReview + stats.missingTags}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="amber"
          onClick={() => {
            setFilters({ tagStatus: ['pending', 'missing'] });
            setCurrentPage('questions');
          }}
        />
        <StatCard
          title="标签覆盖率"
          value={`${stats.tagCoverage}%`}
          icon={<Tag className="w-6 h-6" />}
          color="emerald"
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="本月抽题"
          value={stats.thisMonthExams}
          icon={<FileText className="w-6 h-6" />}
          color="blue"
          onClick={() => setCurrentPage('generator')}
        />
      </div>

      {stats.pendingDrifts > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center animate-pulse">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">检测到 {stats.pendingDrifts} 个难度漂移预警</p>
              <p className="text-sm text-slate-600">建议尽快复核，确保题库难度平衡</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('quality')}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors font-medium"
          >
            查看详情
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {stats.duplicates > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">发现 {stats.duplicates} 组疑似重复题目</p>
              <p className="text-sm text-slate-600">请前往质量监控页处理，避免抽题重复</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('quality')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium"
          >
            查看详情
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">难度分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {difficultyData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-600">
                  {item.name}: {item.value}题
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">知识点分类分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={60} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">最近更新题目</h3>
          <button
            onClick={() => setCurrentPage('questions')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            查看全部 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {recentQuestions.map((q, index) => (
            <div
              key={q.id}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => {
                setCurrentPage('questions');
                setTimeout(() => {
                  useStore.getState().setSelectedQuestionId(q.id);
                  useStore.getState().setCurrentPage('question-detail');
                }, 0);
              }}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{q.title}</p>
                <p className="text-xs text-slate-500">
                  {q.tags.map(t => {
                    const tag = knowledgeTags.find(kt => kt.id === t);
                    return tag?.name;
                  }).filter(Boolean).join('、') || '暂无标签'}
                </p>
              </div>
              <div className="text-xs text-slate-400">
                {new Date(q.updatedAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
