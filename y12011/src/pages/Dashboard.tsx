import { Users, DollarSign, FileText, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { useRebateStore } from '../store/rebateStore';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { getDashboardStats, todos, suggestions, toggleTodo } = useRebateStore();
  const stats = getDashboardStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const pendingTodos = todos.filter(t => t.status === 'pending');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">数据工作台</h1>
        <p className="text-gray-500 mt-1">欢迎回来，查看返利核算最新进展</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="经销商总数"
          value={stats.totalDealers}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="销售发货总额"
          value={formatCurrency(stats.totalSalesAmount)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="待处理试算"
          value={stats.pendingTrials}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="待处理建议"
          value={stats.correctionSuggestions}
          icon={AlertTriangle}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">数据质量概览</h2>
            <Badge variant={stats.dataQualityScore >= 90 ? 'success' : 'warning'}>
              {stats.dataQualityScore}% 完整度
            </Badge>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>数据完整性</span>
              <span>{stats.dataQualityScore}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${stats.dataQualityScore >= 90 ? 'bg-green-500' : 'bg-orange-500'}`}
                style={{ width: `${stats.dataQualityScore}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">缺字段记录</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {100 - stats.dataQualityScore}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">延迟回款</p>
              <p className="text-xl font-bold text-gray-900 mt-1">6 笔</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">待办事项</h2>
            <Badge variant="info">{pendingTodos.length} 项</Badge>
          </div>
          
          <div className="space-y-3">
            {todos.slice(0, 5).map((todo) => (
              <div 
                key={todo.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => toggleTodo(todo.id)}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  todo.status === 'completed' 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-300'
                }`}>
                  {todo.status === 'completed' && (
                    <CheckCircle2 size={14} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${todo.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {todo.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant={todo.priority === 'high' ? 'error' : todo.priority === 'medium' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                    </Badge>
                    <span className="text-xs text-gray-400 flex items-center">
                      <Clock size={12} className="mr-1" />
                      {todo.dueDate}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">修正建议提醒</h2>
          <Link 
            to="/correction/suggestions"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            查看全部 →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingSuggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <Badge 
                  variant={suggestion.priority === 'high' ? 'error' : suggestion.priority === 'medium' ? 'warning' : 'default'}
                >
                  {suggestion.priority === 'high' ? '高优先级' : suggestion.priority === 'medium' ? '中优先级' : '低优先级'}
                </Badge>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{suggestion.title}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{suggestion.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  影响 {suggestion.impactPreview.affectedCount} 条记录
                </span>
                {suggestion.impactPreview.amountChange !== 0 && (
                  <span className={`text-xs font-medium ${
                    suggestion.impactPreview.amountChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {suggestion.impactPreview.amountChange > 0 ? '+' : ''}
                    {formatCurrency(suggestion.impactPreview.amountChange)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
