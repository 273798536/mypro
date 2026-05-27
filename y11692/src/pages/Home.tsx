import React, { useState } from 'react';
import { Plus, Search, Filter, BarChart3, BookOpen, AlertCircle, CheckCircle, Clock, Trash2, Eye } from 'lucide-react';
import { useProblemStore } from '@/store/problemStore';
import { ProblemStatus } from '@/types';
import { calculateReportStats } from '@/utils/export/reportGenerator';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { problems, deleteProblem, setCurrentProblem } = useProblemStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProblemStatus | 'all'>('all');

  const stats = calculateReportStats(problems);

  const filteredProblems = problems.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.expression.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: ProblemStatus) => {
    switch (status) {
      case ProblemStatus.UNPROCESSED:
        return {
          label: '未处理',
          color: 'bg-gray-100 text-gray-700',
          icon: <Clock className="w-4 h-4" />
        };
      case ProblemStatus.CORRECTED:
        return {
          label: '已修正',
          color: 'bg-green-100 text-green-700',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case ProblemStatus.NEEDS_REVIEW:
        return {
          label: '待确认',
          color: 'bg-amber-100 text-amber-700',
          icon: <AlertCircle className="w-4 h-4" />
        };
    }
  };

  const handleViewProblem = (id: string) => {
    setCurrentProblem(id);
    navigate(`/problem/${id}`);
  };

  const handleNewProblem = () => {
    navigate('/problem/new');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">微积分错题曲线器</h1>
                <p className="text-sm text-gray-500">函数极值分析与错题管理系统</p>
              </div>
            </div>
            <button
              onClick={handleNewProblem}
              className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>录入题目</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">题目总数</span>
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">未处理</span>
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-3xl font-bold text-gray-600">{stats.unprocessed}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">已修正</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.corrected}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">待人工确认</span>
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-amber-600">{stats.needsReview}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索题目标题或函数表达式..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ProblemStatus | 'all')}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部状态</option>
                  <option value={ProblemStatus.UNPROCESSED}>未处理</option>
                  <option value={ProblemStatus.CORRECTED}>已修正</option>
                  <option value={ProblemStatus.NEEDS_REVIEW}>待确认</option>
                </select>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredProblems.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">暂无题目</h3>
                <p className="text-gray-500 mb-4">点击右上角按钮录入第一道题目</p>
                <button
                  onClick={handleNewProblem}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  开始录入
                </button>
              </div>
            ) : (
              filteredProblems.map(problem => {
                const statusConfig = getStatusConfig(problem.status);
                const unresolvedErrors = problem.errors.filter(e => !e.isResolved).length;

                return (
                  <div key={problem.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">{problem.title}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <code className="px-2 py-1 bg-gray-100 rounded text-gray-700 font-mono">
                            f(x) = {problem.expression}
                          </code>
                          {unresolvedErrors > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {unresolvedErrors} 个错误
                            </span>
                          )}
                        </div>
                        {problem.source && (
                          <p className="text-xs text-gray-400 mt-2">来源：{problem.source}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleViewProblem(problem.id)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定要删除这道题目吗？')) {
                              deleteProblem(problem.id);
                            }
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
