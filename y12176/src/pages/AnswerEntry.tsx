import { useState, useMemo } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Download,
  User,
  CheckCircle,
  XCircle,
  ArrowRight,
  Tag,
  BarChart3,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/useStore';
import DifficultyBadge from '../components/DifficultyBadge';
import TagBadge from '../components/TagBadge';
import { getCategoryLabel, getDifficultyLabel, formatDateTime, formatDate } from '../utils/algorithms';
import { exportAnswersToXLSX } from '../utils/export';
import type { KnowledgeCategory } from '../types';

export default function AnswerEntry() {
  const {
    questions,
    knowledgeTags,
    addAnswerRecord,
    currentUser,
    setCurrentPage,
    setSelectedQuestionId,
  } = useStore();

  const [selectedQuestionId, setLocalSelectedQuestionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAnswer, setNewAnswer] = useState({
    studentId: '',
    studentName: '',
    isCorrect: true,
    score: 8,
  });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const allStudents = useMemo(() => {
    const students = new Map<string, { id: string; name: string; records: any[] }>();
    questions.forEach(q => {
      q.answerRecords.forEach(r => {
        if (!students.has(r.studentId)) {
          students.set(r.studentId, { id: r.studentId, name: r.studentName, records: [] });
        }
        students.get(r.studentId)!.records.push({ ...r, question: q });
      });
    });
    return Array.from(students.values());
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (searchTerm && !q.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterCategory !== 'all') {
        const hasCategory = q.tags.some(t => {
          const tag = knowledgeTags.find(kt => kt.id === t);
          return tag?.category === filterCategory;
        });
        if (!hasCategory) return false;
      }
      return true;
    });
  }, [questions, knowledgeTags, searchTerm, filterCategory]);

  const selectedQuestion = useMemo(() => {
    return questions.find(q => q.id === selectedQuestionId);
  }, [questions, selectedQuestionId]);

  const selectedStudent = useMemo(() => {
    return allStudents.find(s => s.id === selectedStudentId);
  }, [allStudents, selectedStudentId]);

  const categoryStats = useMemo(() => {
    const stats: Record<KnowledgeCategory, { total: number; correct: number }> = {
      rhythm: { total: 0, correct: 0 },
      harmony: { total: 0, correct: 0 },
      melody: { total: 0, correct: 0 },
      interval: { total: 0, correct: 0 },
      chord: { total: 0, correct: 0 },
    };

    questions.forEach(q => {
      q.answerRecords.forEach(r => {
        q.tags.forEach(t => {
          const tag = knowledgeTags.find(kt => kt.id === t);
          if (tag) {
            stats[tag.category].total++;
            if (r.isCorrect) stats[tag.category].correct++;
          }
        });
      });
    });

    return Object.entries(stats).map(([key, val]) => ({
      name: getCategoryLabel(key as KnowledgeCategory),
      正确率: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      color: { rhythm: '#8b5cf6', harmony: '#3b82f6', melody: '#10b981', interval: '#f59e0b', chord: '#ec4899' }[key],
    }));
  }, [questions, knowledgeTags]);

  const difficultyStats = useMemo(() => {
    const stats = { easy: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } };
    questions.forEach(q => {
      q.answerRecords.forEach(r => {
        stats[q.difficulty].total++;
        if (r.isCorrect) stats[q.difficulty].correct++;
      });
    });
    return [
      { name: '易', value: stats.easy.total > 0 ? Math.round((stats.easy.correct / stats.easy.total) * 100) : 0, color: '#10b981' },
      { name: '中', value: stats.medium.total > 0 ? Math.round((stats.medium.correct / stats.medium.total) * 100) : 0, color: '#f59e0b' },
      { name: '难', value: stats.hard.total > 0 ? Math.round((stats.hard.correct / stats.hard.total) * 100) : 0, color: '#ef4444' },
    ];
  }, [questions]);

  const handleAddAnswer = () => {
    if (!selectedQuestionId || !newAnswer.studentName) return;
    addAnswerRecord(selectedQuestionId, {
      ...newAnswer,
      studentId: newAnswer.studentId || `stu-${Date.now()}`,
      answerTime: Date.now(),
    });
    setShowAddForm(false);
    setNewAnswer({ studentId: '', studentName: '', isCorrect: true, score: 8 });
  };

  const handleExportAll = () => {
    exportAnswersToXLSX(questions);
  };

  const totalRecords = questions.reduce((sum, q) => sum + q.answerRecords.length, 0);
  const totalCorrect = questions.reduce((sum, q) => sum + q.answerRecords.filter(r => r.isCorrect).length, 0);
  const overallRate = totalRecords > 0 ? Math.round((totalCorrect / totalRecords) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">答题记录总数</p>
              <p className="text-2xl font-bold text-slate-800">{totalRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总正确率</p>
              <p className="text-2xl font-bold text-slate-800">{overallRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">学生人数</p>
              <p className="text-2xl font-bold text-slate-800">{allStudents.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已答题目</p>
              <p className="text-2xl font-bold text-slate-800">{questions.filter(q => q.answerRecords.length > 0).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">各知识点正确率</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} unit="%" domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="正确率" radius={[4, 4, 0, 0]}>
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">各难度正确率</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="70%" height="100%">
              <PieChart>
                <Pie
                  data={difficultyStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {difficultyStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">题目列表 - 选择题目录入成绩</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索题目..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-64"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as any)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="all">全部分类</option>
              <option value="rhythm">节奏</option>
              <option value="harmony">和声</option>
              <option value="melody">旋律</option>
              <option value="interval">音程</option>
              <option value="chord">和弦</option>
            </select>
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              导出全部
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {filteredQuestions.map((q, idx) => {
              const correctCount = q.answerRecords.filter(r => r.isCorrect).length;
              const rate = q.answerRecords.length > 0
                ? Math.round((correctCount / q.answerRecords.length) * 100)
                : '-';

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setLocalSelectedQuestionId(q.id);
                    setSelectedStudentId(null);
                    setShowAddForm(false);
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedQuestionId === q.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                      : 'border-transparent bg-slate-50 hover:border-indigo-200 hover:bg-slate-100'
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <DifficultyBadge difficulty={q.difficulty} />
                        <span className="text-xs text-slate-500">
                          {q.answerRecords.length} 人次作答
                        </span>
                        {typeof rate === 'number' && (
                          <span className={`text-xs font-medium ${
                            rate >= 70 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            正确率 {rate}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 line-clamp-2">{q.title}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {q.tags.slice(0, 3).map(tid => {
                          const tag = knowledgeTags.find(t => t.id === tid);
                          return tag ? <TagBadge key={tid} tag={tag} /> : null;
                        })}
                      </div>
                    </div>
                    <ArrowRight className={`w-5 h-5 transition-colors ${
                      selectedQuestionId === q.id ? 'text-indigo-500' : 'text-slate-300'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            {selectedQuestion ? (
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-800">题目详情</h4>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    录入成绩
                  </button>
                </div>

                <p className="text-sm text-slate-700 mb-3">{selectedQuestion.title}</p>
                <div className="flex items-center gap-2 mb-4">
                  <DifficultyBadge difficulty={selectedQuestion.difficulty} />
                  <span className="text-xs text-slate-500">正确答案: {selectedQuestion.correctAnswer}</span>
                </div>

                {showAddForm && (
                  <div className="bg-white rounded-xl p-4 mb-4 border border-slate-200">
                    <h5 className="font-medium text-slate-700 mb-3">录入答题结果</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">学生姓名</label>
                        <input
                          type="text"
                          value={newAnswer.studentName}
                          onChange={e => setNewAnswer({ ...newAnswer, studentName: e.target.value, studentId: `stu-${e.target.value}` })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          placeholder="请输入学生姓名"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">答题结果</label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setNewAnswer({ ...newAnswer, isCorrect: true })}
                            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                              newAnswer.isCorrect
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            正确
                          </button>
                          <button
                            onClick={() => setNewAnswer({ ...newAnswer, isCorrect: false })}
                            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                              !newAnswer.isCorrect
                                ? 'bg-rose-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <XCircle className="w-4 h-4 inline mr-1" />
                            错误
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">得分: {newAnswer.score}</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={newAnswer.score}
                          onChange={e => setNewAnswer({ ...newAnswer, score: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <button
                        onClick={handleAddAnswer}
                        disabled={!newAnswer.studentName}
                        className="w-full py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        保存成绩
                      </button>
                    </div>
                  </div>
                )}

                <h5 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  答题记录 ({selectedQuestion.answerRecords.length})
                </h5>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {selectedQuestion.answerRecords.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">暂无答题记录，点击上方"录入成绩"开始</p>
                  ) : (
                    [...selectedQuestion.answerRecords]
                      .sort((a, b) => b.answerTime - a.answerTime)
                      .map((record, idx) => (
                        <div
                          key={record.id}
                          onClick={() => setSelectedStudentId(record.studentId)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            selectedStudentId === record.studentId
                              ? 'border-indigo-300 bg-indigo-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                record.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}>
                                {record.studentName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{record.studentName}</p>
                                <p className="text-xs text-slate-500">{formatDateTime(record.answerTime)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-medium ${
                                record.isCorrect ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {record.isCorrect ? '正确' : '错误'}
                              </span>
                              <p className="text-xs text-slate-500">得分: {record.score}</p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-12 text-center">
                <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">请从左侧选择一个题目</p>
              </div>
            )}

            {selectedStudent && (
              <div className="mt-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-500" />
                    {selectedStudent.name} 的答题统计
                    <span className="text-xs font-normal text-slate-500">（点击返回题目）</span>
                  </h4>
                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    清除筛选
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{selectedStudent.records.length}</p>
                    <p className="text-xs text-slate-500">答题总数</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {selectedStudent.records.filter(r => r.isCorrect).length}
                    </p>
                    <p className="text-xs text-slate-500">正确数</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {Math.round((selectedStudent.records.filter(r => r.isCorrect).length / selectedStudent.records.length) * 100)}%
                    </p>
                    <p className="text-xs text-slate-500">正确率</p>
                  </div>
                </div>

                <h5 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  知识点标签关联分析（反向追溯）
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedStudent.records.slice(0, 5).map((record: any) => {
                    const relatedTags = record.question.tags
                      .map((tid: string) => knowledgeTags.find(t => t.id === tid))
                      .filter(Boolean);
                    return (
                      <div
                        key={record.id}
                        className="p-3 bg-white rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors"
                        onClick={() => {
                          setSelectedQuestionId(record.question.id);
                          setCurrentPage('question-detail');
                          setTimeout(() => {
                            useStore.getState().setSelectedQuestionId(record.question.id);
                            useStore.getState().setCurrentPage('question-detail');
                          }, 0);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-slate-700 truncate">{record.question.title}</p>
                          <span className={`text-xs ${record.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {record.isCorrect ? '正确' : '错误'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {relatedTags.map((tag: any) => (
                            <TagBadge key={tag.id} tag={tag} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-800">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    <strong>反向追溯：</strong>从学生答题结果出发，可追溯到对应的知识点标签和原题，
                    便于分析薄弱知识点并针对性调整教学。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
