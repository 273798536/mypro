import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import DataCard from '@/components/DataCard';
import { formatDateStr, formatDateTime, formatCurrency } from '@/utils/format';
import { exportExceptions } from '@/utils/export';
import type { Exception, ExceptionType, ExceptionStatus, ExceptionSeverity } from '@/types';
import { EXCEPTION_TYPE_LABELS, EXCEPTION_SEVERITY_LABELS, EXCEPTION_STATUS_LABELS } from '@/types';
import { 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  FileText, 
  Filter, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  Play,
  CheckCircle,
  Download,
  ArrowRight,
  Database,
  Link2,
  Film,
  Calculator,
  MessageSquare,
  Send
} from 'lucide-react';

export default function Exceptions() {
  const navigate = useNavigate();
  const { 
    exceptions, 
    getSeriesById, 
    getCalculationById,
    getSeriesMap,
    getCalculationMap,
    updateExceptionStatus
  } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExceptionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ExceptionStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ExceptionSeverity | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [newStatus, setNewStatus] = useState<ExceptionStatus>('processing');
  const [remark, setRemark] = useState('');
  
  const stats = useMemo(() => {
    const open = exceptions.filter(e => e.status === 'open').length;
    const processing = exceptions.filter(e => e.status === 'processing').length;
    const resolved = exceptions.filter(e => e.status === 'resolved').length;
    const highPriority = exceptions.filter(e => e.severity === 'high' && e.status !== 'resolved').length;
    
    return { open, processing, resolved, highPriority };
  }, [exceptions]);
  
  const filteredExceptions = useMemo(() => {
    return exceptions
      .filter(exc => {
        const calc = getCalculationById(exc.calculationId);
        const series = calc ? getSeriesById(calc.seriesId) : undefined;
        const searchText = `${series?.name || ''} ${EXCEPTION_TYPE_LABELS[exc.type]} ${exc.blockPoint} ${exc.triggerSource}`.toLowerCase();
        const matchesSearch = searchText.includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || exc.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || exc.status === statusFilter;
        const matchesSeverity = severityFilter === 'all' || exc.severity === severityFilter;
        
        return matchesSearch && matchesType && matchesStatus && matchesSeverity;
      })
      .sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        const statusOrder = { open: 0, processing: 1, resolved: 2 };
        if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
        if (a.severity !== b.severity) return severityOrder[a.severity] - severityOrder[b.severity];
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [exceptions, searchTerm, typeFilter, statusFilter, severityFilter, getCalculationById, getSeriesById]);
  
  const getExceptionIcon = (type: ExceptionType) => {
    const iconMap: Record<ExceptionType, React.ElementType> = {
      cost_delay: Clock,
      payment_split: CreditCard,
      account_mismatch: AlertTriangle,
      data_missing: FileText,
    };
    return iconMap[type];
  };
  
  const getExceptionColor = (type: ExceptionType) => {
    const colorMap: Record<ExceptionType, string> = {
      cost_delay: 'text-red-500 bg-red-50',
      payment_split: 'text-purple-500 bg-purple-50',
      account_mismatch: 'text-orange-500 bg-orange-50',
      data_missing: 'text-gray-500 bg-gray-50',
    };
    return colorMap[type];
  };
  
  const getSeverityDotColor = (severity: ExceptionSeverity) => {
    const colorMap: Record<ExceptionSeverity, string> = {
      high: 'bg-red-500',
      medium: 'bg-amber-500',
      low: 'bg-blue-500',
    };
    return colorMap[severity];
  };
  
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  const openStatusModal = (exception: Exception, status: ExceptionStatus) => {
    setSelectedException(exception);
    setNewStatus(status);
    setRemark(exception.remark || '');
    setShowStatusModal(true);
  };
  
  const handleStatusUpdate = () => {
    if (!selectedException) return;
    updateExceptionStatus(selectedException.id, newStatus, remark);
    setShowStatusModal(false);
    setSelectedException(null);
    setRemark('');
  };
  
  const handleExport = () => {
    const calcMap = getCalculationMap();
    const seriesMap = getSeriesMap();
    exportExceptions(filteredExceptions, calcMap, seriesMap);
  };
  
  const renderActionButtons = (exception: Exception) => {
    if (exception.status === 'open') {
      return (
        <button
          className="btn-primary text-xs px-3 py-1.5"
          onClick={(e) => {
            e.stopPropagation();
            openStatusModal(exception, 'processing');
          }}
        >
          <Play className="w-3 h-3" />
          开始处理
        </button>
      );
    }
    if (exception.status === 'processing') {
      return (
        <button
          className="btn-success text-xs px-3 py-1.5"
          onClick={(e) => {
            e.stopPropagation();
            openStatusModal(exception, 'resolved');
          }}
        >
          <CheckCircle className="w-3 h-3" />
          标记已解决
        </button>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">异常处理中心</h1>
          <p className="text-gray-500 mt-1">管理和处理所有数据异常，确保测算准确性</p>
        </div>
        <button className="btn-secondary" onClick={handleExport}>
          <Download className="w-4 h-4" />
          导出异常报表
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          title="待处理"
          value={stats.open}
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          className="animate-stagger-1"
        />
        <DataCard
          title="处理中"
          value={stats.processing}
          icon={Play}
          iconBg="bg-blue-50"
          className="animate-stagger-2"
        />
        <DataCard
          title="已解决"
          value={stats.resolved}
          icon={CheckCircle}
          iconBg="bg-emerald-50"
          className="animate-stagger-3"
        />
        <DataCard
          title="高优先级"
          value={stats.highPriority}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          className="animate-stagger-4"
        />
      </div>
      
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 font-serif">异常列表</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索剧集名称、异常类型..."
                className="input pl-10 w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="input w-32"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as ExceptionType | 'all')}
              >
                <option value="all">全部类型</option>
                <option value="cost_delay">消耗延迟</option>
                <option value="payment_split">回款拆分</option>
                <option value="account_mismatch">账号串剧</option>
                <option value="data_missing">数据缺失</option>
              </select>
            </div>
            <select
              className="input w-32"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ExceptionStatus | 'all')}
            >
              <option value="all">全部状态</option>
              <option value="open">待处理</option>
              <option value="processing">处理中</option>
              <option value="resolved">已解决</option>
            </select>
            <select
              className="input w-32"
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as ExceptionSeverity | 'all')}
            >
              <option value="all">全部优先级</option>
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-3">
          {filteredExceptions.map(exception => {
            const Icon = getExceptionIcon(exception.type);
            const isExpanded = expandedId === exception.id;
            const calc = getCalculationById(exception.calculationId);
            const series = calc ? getSeriesById(calc.seriesId) : undefined;
            
            return (
              <div
                key={exception.id}
                className={`border rounded-lg transition-all ${
                  isExpanded ? 'border-primary-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => toggleExpand(exception.id)}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getExceptionColor(exception.type)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${getSeverityDotColor(exception.severity)}`} />
                      <p className="font-semibold text-gray-800">{EXCEPTION_TYPE_LABELS[exception.type]}</p>
                      <StatusBadge status={exception.severity} type="exception-severity" />
                      <StatusBadge status={exception.status} type="exception-status" />
                    </div>
                    <p className="text-sm text-gray-500 truncate">{exception.blockPoint}</p>
                    {series && (
                      <p className="text-xs text-gray-400 mt-1">
                        关联剧集：{series.name} · 测算周期：{calc ? `${formatDateStr(calc.periodStart)} ~ ${formatDateStr(calc.periodEnd)}` : '-'}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-400">{formatDateStr(exception.createdAt)}</p>
                    {renderActionButtons(exception)}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Database className="w-4 h-4 text-primary-600" />
                          <h4 className="font-medium text-gray-800">触发材料</h4>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="text-gray-500">来源：</span>
                          {exception.triggerSource}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="text-gray-500">编号：</span>
                          {exception.triggerSourceId}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <h4 className="font-medium text-gray-800">卡点位置</h4>
                        </div>
                        <p className="text-sm text-gray-700">{exception.blockPoint}</p>
                        {calc && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              影响测算：
                              <span className="text-primary-600 ml-1">{calc.id}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              影响金额：
                              <span className="text-red-500 ml-1">{formatCurrency(calc.totalCost)}</span>
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowRight className="w-4 h-4 text-emerald-500" />
                          <h4 className="font-medium text-gray-800">下一步指引</h4>
                        </div>
                        <p className="text-sm text-gray-700">{exception.nextStep}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">快速跳转：</span>
                      </div>
                      {series && (
                        <button
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-md border border-primary-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/series/${series.id}`);
                          }}
                        >
                          <Film className="w-3.5 h-3.5" />
                          {series.name} 详情
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {calc && (
                        <button
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-md border border-primary-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/calculation/${calc.id}`);
                          }}
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          测算详情
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      {exception.remark && (
                        <div className="flex items-center gap-2 ml-auto bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-sm text-amber-700">备注：{exception.remark}</span>
                        </div>
                      )}
                    </div>
                    
                    {exception.resolvedAt && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                          于 {formatDateTime(exception.resolvedAt)} 解决
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {filteredExceptions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无符合条件的异常</p>
            <p className="text-sm mt-1">尝试调整筛选条件</p>
          </div>
        )}
      </div>
      
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={newStatus === 'processing' ? '标记为处理中' : '标记为已解决'}
        width="max-w-lg"
      >
        {selectedException && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const Icon = getExceptionIcon(selectedException.type);
                  return <Icon className="w-5 h-5 text-amber-500" />;
                })()}
                <span className="font-medium text-gray-800">{EXCEPTION_TYPE_LABELS[selectedException.type]}</span>
              </div>
              <p className="text-sm text-gray-600">{selectedException.blockPoint}</p>
            </div>
            
            <div>
              <label className="label">处理备注</label>
              <textarea
                className="input min-h-[100px] resize-none"
                placeholder="请输入处理备注，方便后续追溯..."
                value={remark}
                onChange={e => setRemark(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                备注将记录在异常历史中，建议详细说明处理情况
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <button
                className="btn-secondary"
                onClick={() => setShowStatusModal(false)}
              >
                取消
              </button>
              <button
                className={newStatus === 'processing' ? 'btn-primary' : 'btn-success'}
                onClick={handleStatusUpdate}
              >
                <Send className="w-4 h-4" />
                {newStatus === 'processing' ? '确认处理' : '确认解决'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
