import { useState } from 'react';
import {
  AlertTriangle,
  Tag,
  GitCompare,
  RefreshCw,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  formatCurrency,
  formatDate,
  getExceptionTypeLabel,
  getExceptionStatusLabel,
} from '../utils/format';
import { cn } from '../lib/utils';
import { ExceptionRecord, ExceptionStatus, ExceptionType, TabType } from '../types';

export function Exceptions() {
  const exceptions = useStore((state) => state.exceptions);
  const updateExceptionStatus = useStore((state) => state.updateExceptionStatus);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [handlerNote, setHandlerNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs: { key: TabType; label: string; icon: typeof AlertTriangle }[] = [
    { key: 'all', label: '全部异常', icon: AlertTriangle },
    { key: 'missing_tag', label: '标签缺失', icon: Tag },
    { key: 'cross_project', label: '资源串项目', icon: GitCompare },
    { key: 'refund_occupied', label: '退款占用', icon: RefreshCw },
  ];

  const filteredExceptions = exceptions.filter((ex) => {
    const matchType = activeTab === 'all' || ex.exceptionType === activeTab;
    const matchSearch =
      ex.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.relatedResourceId && ex.relatedResourceId.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchType && matchSearch;
  });

  const stats = {
    all: exceptions.length,
    pending: exceptions.filter((ex) => ex.status === 'pending').length,
    missing_tag: exceptions.filter((ex) => ex.exceptionType === 'missing_tag').length,
    cross_project: exceptions.filter((ex) => ex.exceptionType === 'cross_project').length,
    refund_occupied: exceptions.filter((ex) => ex.exceptionType === 'refund_occupied').length,
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-danger-100 text-danger-700';
      case 'medium':
        return 'bg-warning-100 text-warning-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      high: '高风险',
      medium: '中风险',
      low: '低风险',
    };
    return labels[severity] || severity;
  };

  const getStatusColor = (status: ExceptionStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-100 text-warning-700';
      case 'processing':
        return 'bg-primary-100 text-primary-700';
      case 'resolved':
        return 'bg-success-100 text-success-700';
      case 'ignored':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleStatusUpdate = (exceptionId: string, status: ExceptionStatus) => {
    updateExceptionStatus(exceptionId, status, handlerNote || undefined);
    setHandlerNote('');
    setExpandedId(null);
  };

  const getTypeIcon = (type: ExceptionType) => {
    switch (type) {
      case 'missing_tag':
        return <Tag className="w-5 h-5" />;
      case 'cross_project':
        return <GitCompare className="w-5 h-5" />;
      case 'refund_occupied':
        return <RefreshCw className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">异常复核中心</h1>
          <p className="text-gray-500 mt-1">处理标签缺失、资源串项目、退款占用等异常</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            导出异常清单
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-warning-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
            </div>
            <span className="text-sm text-gray-500">待处理</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
        </div>
        {tabs.slice(1).map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.key}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-sm text-gray-500">{tab.label}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats[tab.key]}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeTab === tab.key
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">
                      {stats[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索异常..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option>全部状态</option>
                  <option>待处理</option>
                  <option>处理中</option>
                  <option>已解决</option>
                  <option>已忽略</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredExceptions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <CheckCircle className="w-16 h-16 mx-auto text-success-500 mb-4" />
              <p className="text-lg">暂无异常记录</p>
              <p className="text-sm">所有数据均已正常处理</p>
            </div>
          ) : (
            filteredExceptions.map((ex) => (
              <div key={ex.exceptionId} className="hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => setExpandedId(expandedId === ex.exceptionId ? null : ex.exceptionId)}
                  className="w-full px-6 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {expandedId === ex.exceptionId ? (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          ex.exceptionType === 'missing_tag'
                            ? 'bg-warning-50 text-warning-600'
                            : ex.exceptionType === 'cross_project'
                            ? 'bg-danger-50 text-danger-600'
                            : 'bg-purple-50 text-purple-600'
                        )}
                      >
                        {getTypeIcon(ex.exceptionType)}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('px-2 py-0.5 text-xs rounded-full', getSeverityColor(ex.severity))}>
                            {getSeverityLabel(ex.severity)}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {getExceptionTypeLabel(ex.exceptionType)}
                          </span>
                          <span className={cn('px-2 py-0.5 text-xs rounded-full', getStatusColor(ex.status))}>
                            {getExceptionStatusLabel(ex.status)}
                          </span>
                        </div>
                        <p className="text-gray-900 font-medium mt-1">{ex.description}</p>
                        {ex.relatedResourceId && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            关联资源: {ex.relatedResourceId}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">发现时间</p>
                        <p className="text-sm text-gray-700">{formatDate(ex.createdAt)}</p>
                      </div>
                      {ex.handledBy && (
                        <div className="text-right">
                          <p className="text-sm text-gray-500">处理人</p>
                          <p className="text-sm text-gray-700">{ex.handledBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {expandedId === ex.exceptionId && (
                  <div className="px-6 pb-6">
                    <div className="ml-9 bg-gray-50 rounded-xl p-5">
                      <div className="grid grid-cols-2 gap-6 mb-5">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">处理建议</h4>
                          <p className="text-gray-700">{ex.suggestion}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">关联信息</h4>
                          <div className="space-y-1 text-sm text-gray-700">
                            {ex.relatedBillId && <p>账单ID: {ex.relatedBillId}</p>}
                            {ex.relatedItemId && <p>明细ID: {ex.relatedItemId}</p>}
                            {ex.relatedResourceId && <p>资源ID: {ex.relatedResourceId}</p>}
                          </div>
                        </div>
                      </div>

                      {ex.handlerNote && (
                        <div className="mb-5">
                          <h4 className="text-sm font-medium text-gray-500 mb-2">处理备注</h4>
                          <p className="text-gray-700">{ex.handlerNote}</p>
                        </div>
                      )}

                      {ex.status === 'pending' && (
                        <div className="border-t border-gray-200 pt-5">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-500 mb-2">
                                <MessageSquare className="w-4 h-4 inline mr-1" />
                                处理备注（可选）
                              </label>
                              <input
                                type="text"
                                value={handlerNote}
                                onChange={(e) => setHandlerNote(e.target.value)}
                                placeholder="请输入处理备注..."
                                className="w-full h-10 px-4 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-5">
                              <button
                                onClick={() => handleStatusUpdate(ex.exceptionId, 'ignored')}
                                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                忽略
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(ex.exceptionId, 'processing')}
                                className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                              >
                                <Clock className="w-4 h-4 inline mr-1" />
                                处理中
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(ex.exceptionId, 'resolved')}
                                className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                标记已解决
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-2">复核原则</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• <strong>不偷改口径</strong>：材料冲突时，保留原始数据，通过人工备注说明，不直接修改源数据</li>
              <li>• <strong>明确责任人</strong>：每项异常需明确处理人及处理时间，确保可追溯</li>
              <li>• <strong>具体提示</strong>：异常描述需明确到具体资源或对象，避免笼统的"处理失败"</li>
              <li>• 建议在每月5日前完成上月异常复核，确保分摊数据准确</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
