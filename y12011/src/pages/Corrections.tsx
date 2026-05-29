import { Search, CheckCircle, XCircle, AlertTriangle, TrendingDown, ArrowRight, Lightbulb } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useRebateStore } from '../store/rebateStore';
import { useState } from 'react';

export default function Corrections() {
  const { suggestions, applySuggestion } = useRebateStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredSuggestions = suggestions.filter((suggestion) => {
    const matchesType = filterType === 'all' || suggestion.type === filterType;
    const matchesStatus = filterStatus === 'all' || suggestion.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment_write_off':
        return <TrendingDown size={16} className="text-orange-500" />;
      case 'sales_return':
        return <ArrowRight size={16} className="text-purple-500" />;
      default:
        return <AlertTriangle size={16} className="text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'payment_write_off':
        return '回款冲销';
      case 'sales_return':
        return '销量退货';
      default:
        return '其他修正';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">待处理</Badge>;
      case 'applied':
        return <Badge variant="success">已应用</Badge>;
      case 'rejected':
        return <Badge variant="error">已驳回</Badge>;
      default:
        return <Badge variant="default">未知</Badge>;
    }
  };

  const handleApply = (suggestionId: string) => {
    applySuggestion(suggestionId, '财务BP-张三');
  };

  const stats = {
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === 'pending').length,
    applied: suggestions.filter(s => s.status === 'applied').length,
    amount: suggestions.filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.impactPreview?.amountChange || 0), 0)
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">修正中心</h1>
          <p className="text-gray-500 mt-1">回款冲销和销量退货的修正建议处理</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">建议总数</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">待处理</p>
          <p className="text-2xl font-bold text-orange-600 mt-2">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">已应用</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{stats.applied}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">待处理金额</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(stats.amount)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">类型:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              <option value="payment_write_off">回款冲销</option>
              <option value="sales_return">销量退货</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">状态:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="applied">已应用</option>
              <option value="rejected">已驳回</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredSuggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {getTypeIcon(suggestion.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{suggestion.title}</h3>
                      {getStatusBadge(suggestion.status)}
                      <Badge variant="info">{getTypeLabel(suggestion.type)}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">类型: {getTypeLabel(suggestion.type)}</p>
                    <div className="mt-4 flex items-center gap-6">
                      <div>
                        <span className="text-xs text-gray-500 uppercase">影响金额</span>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(suggestion.impactPreview?.amountChange || 0)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase">影响单据</span>
                        <p className="text-lg font-semibold text-blue-600">{suggestion.impactPreview?.affectedCount || 0} 笔</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {suggestion.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleApply(suggestion.id)}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        应用
                      </button>
                      <button className="flex items-center px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                        <XCircle size={14} className="mr-1" />
                        驳回
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-start gap-2">
                  <Lightbulb size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">修正建议</p>
                    <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">操作步骤:</p>
                  <ul className="space-y-1">
                    {suggestion.actionableSteps.map((step, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-500 mr-2">{idx + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-6 mt-3">
                  <p className="text-xs text-gray-500">
                    关联单据: <span className="font-medium text-gray-700">{suggestion.affectedOrders.slice(0, 3).join(', ')}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredSuggestions.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">暂无符合条件的修正建议</p>
          </div>
        )}
      </div>
    </div>
  );
}
