import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import DataCard from '@/components/DataCard';
import Timeline from '@/components/Timeline';
import { formatCurrency, formatPercent, formatDateStr, formatDateFull, formatDateTime } from '@/utils/format';
import { exportSeriesDetail } from '@/utils/export';
import { getCurrentOperator } from '@/engine/changeTracker';
import type { Cost, Flow, Payment, ChangeLog, Exception } from '@/types';
import { EXCEPTION_TYPE_LABELS } from '@/types';
import { 
  Film, 
  Download, 
  ArrowLeft, 
  CalendarDays, 
  DollarSign,
  TrendingUp,
  Wallet,
  Banknote,
  ChevronRight,
  AlertTriangle,
  Clock,
  Calendar,
  Calculator,
  RefreshCw,
  Link2,
  GitBranch,
  BarChart3,
  CreditCard,
  FileText,
  ChevronDown,
  ChevronUp,
  User,
  Database,
  ArrowRight
} from 'lucide-react';

type TabType = 'costs' | 'flows' | 'payments';

export default function CalculationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getCalculationById, 
    getSeriesById,
    getCalculationExceptions,
    getSeriesChangeLogs,
    costs,
    flows,
    payments,
    triggerCalculation
  } = useAppStore();
  
  const calculation = id ? getCalculationById(id) : undefined;
  const series = calculation ? getSeriesById(calculation.seriesId) : undefined;
  const exceptions = id ? getCalculationExceptions(id) : [];
  const changeLogs = calculation ? getSeriesChangeLogs(calculation.seriesId) : [];
  
  const [activeTab, setActiveTab] = useState<TabType>('costs');
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedChangeId, setExpandedChangeId] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  
  const relatedCosts = useMemo(() => {
    if (!calculation) return [];
    return costs.filter(c => calculation.costIds.includes(c.id));
  }, [calculation, costs]);
  
  const relatedFlows = useMemo(() => {
    if (!calculation) return [];
    return flows.filter(f => calculation.flowIds.includes(f.id));
  }, [calculation, flows]);
  
  const relatedPayments = useMemo(() => {
    if (!calculation) return [];
    return payments.filter(p => calculation.paymentIds.includes(p.id));
  }, [calculation, payments]);
  
  const relatedChanges = useMemo(() => {
    if (!calculation) return [];
    return changeLogs.filter(log => 
      log.affectedCalculations.includes(calculation.id) || 
      (log.calculationId === calculation.id)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [calculation, changeLogs]);
  
  const openRecalcModal = () => {
    if (!calculation) return;
    setPeriodStart(calculation.periodStart);
    setPeriodEnd(calculation.periodEnd);
    setShowCalcModal(true);
  };
  
  const handleRecalc = async () => {
    if (!calculation || !periodStart || !periodEnd) return;
    
    setIsCalculating(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    triggerCalculation(calculation.seriesId, periodStart, periodEnd, calculation.id);
    
    setIsCalculating(false);
    setShowCalcModal(false);
  };
  
  const handleExport = () => {
    if (!series || !calculation) return;
    exportSeriesDetail(series, [calculation], relatedCosts, relatedFlows, relatedPayments);
  };
  
  const toggleChangeExpand = (changeId: string) => {
    setExpandedChangeId(expandedChangeId === changeId ? null : changeId);
  };
  
  const tabs: { key: TabType; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'costs', label: '投流消耗明细', icon: TrendingUp, count: relatedCosts.length },
    { key: 'flows', label: '充值流水明细', icon: Wallet, count: relatedFlows.length },
    { key: 'payments', label: '渠道回款明细', icon: Banknote, count: relatedPayments.length },
  ];
  
  if (!calculation || !series) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Calculator className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">测算记录不存在</p>
        <button
          className="mt-4 text-primary-600 hover:text-primary-700 flex items-center gap-1"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4" />
          返回测算工作台
        </button>
      </div>
    );
  }
  
  const renderDataTable = <T extends { id: string }>(
    data: T[],
    columns: { key: keyof T; label: string; render?: (item: T) => React.ReactNode }[]
  ) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map(col => (
              <th key={String(col.key)} className="table-header">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              {columns.map(col => (
                <td key={String(col.key)} className="table-cell">
                  {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无数据</p>
        </div>
      )}
    </div>
  );
  
  const getExceptionIcon = (type: string) => {
    const iconMap: Record<string, React.ElementType> = {
      cost_delay: Clock,
      payment_split: CreditCard,
      account_mismatch: AlertTriangle,
      data_missing: FileText,
    };
    return iconMap[type] || AlertTriangle;
  };
  
  const getExceptionColor = (type: string) => {
    const colorMap: Record<string, string> = {
      cost_delay: 'text-red-500 bg-red-50',
      payment_split: 'text-purple-500 bg-purple-50',
      account_mismatch: 'text-orange-500 bg-orange-50',
      data_missing: 'text-gray-500 bg-gray-50',
    };
    return colorMap[type] || 'text-gray-500 bg-gray-50';
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => navigate(`/series/${series.id}`)}
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800 font-serif">
            {series.name}
            <span className="ml-3 text-lg font-normal text-gray-500">测算详情</span>
          </h1>
          <p className="text-gray-500 mt-1">
            测算周期：{formatDateStr(calculation.periodStart)} ~ {formatDateStr(calculation.periodEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={openRecalcModal}>
            <RefreshCw className="w-4 h-4" />
            重新测算
          </button>
          <button className="btn-primary" onClick={handleExport}>
            <Download className="w-4 h-4" />
            导出测算数据
          </button>
        </div>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 font-serif mb-4">测算概览</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Film className="w-4 h-4" />
              剧集名称
            </div>
            <p className="text-lg font-semibold text-gray-800 truncate">{series.name}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CalendarDays className="w-4 h-4" />
              测算周期
            </div>
            <p className="text-sm font-semibold text-gray-800">
              {formatDateStr(calculation.periodStart)} ~ {formatDateStr(calculation.periodEnd)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              总成本
            </div>
            <p className="text-xl font-semibold text-gray-800">{formatCurrency(calculation.totalCost)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Wallet className="w-4 h-4" />
              充值流水
            </div>
            <p className="text-xl font-semibold text-blue-600">{formatCurrency(calculation.totalFlow)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Banknote className="w-4 h-4" />
              渠道回款
            </div>
            <p className="text-xl font-semibold text-emerald-600">{formatCurrency(calculation.totalPayment)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              回收率
            </div>
            <p className={`text-xl font-semibold ${calculation.recoveryRate >= 0.5 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {formatPercent(calculation.recoveryRate)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              利润
            </div>
            <p className={`text-xl font-semibold ${calculation.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {calculation.profit >= 0 ? '+' : ''}{formatCurrency(calculation.profit)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <GitBranch className="w-4 h-4" />
              版本号
            </div>
            <p className="text-xl font-semibold text-gray-800">v{calculation.version}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              状态
            </div>
            <div className="mt-1">
              <StatusBadge status={calculation.status} type="calculation" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              测算时间
            </div>
            <p className="text-sm font-semibold text-gray-800">{formatDateTime(calculation.calculatedAt)}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataCard
          title="投流消耗明细"
          value={relatedCosts.length + ' 条'}
          icon={TrendingUp}
          iconBg="bg-red-50"
          className="animate-stagger-1"
        />
        <DataCard
          title="充值流水明细"
          value={relatedFlows.length + ' 条'}
          icon={Wallet}
          iconBg="bg-blue-50"
          className="animate-stagger-2"
        />
        <DataCard
          title="渠道回款明细"
          value={relatedPayments.length + ' 条'}
          icon={Banknote}
          iconBg="bg-emerald-50"
          className="animate-stagger-3"
        />
      </div>
      
      <div className="card border-2 border-primary-100 bg-primary-50/30">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-800">数据归集关系说明</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <FileText className="w-4 h-4 text-primary-600" />
            <span>剧集档案</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span>投流消耗 ({relatedCosts.length}条)</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <Wallet className="w-4 h-4 text-blue-500" />
            <span>充值流水 ({relatedFlows.length}条)</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <Banknote className="w-4 h-4 text-emerald-500" />
            <span>渠道回款 ({relatedPayments.length}条)</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-2 bg-primary-100 px-3 py-2 rounded-lg border border-primary-200">
            <Calculator className="w-4 h-4 text-primary-600" />
            <span className="font-medium">测算结果 v{calculation.version}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <Download className="w-4 h-4 text-emerald-500" />
            <span>报表导出</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          本测算归集了 {relatedCosts.length + relatedFlows.length + relatedPayments.length} 条原始数据，
          覆盖周期 {formatDateStr(calculation.periodStart)} 至 {formatDateStr(calculation.periodEnd)}。
          报表导出数据与测算口径完全一致，方便后续复核。
        </p>
      </div>
      
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800 font-serif">关联线索</h2>
          <span className="text-sm font-normal text-gray-400">（归集到本次测算的多源数据）</span>
        </div>
        
        <div className="flex gap-1 mb-4 border-b border-gray-100">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="min-h-[300px]">
          {activeTab === 'costs' && renderDataTable<Cost>(
            relatedCosts,
            [
              { key: 'costDate', label: '消耗日期', render: (item) => formatDateStr(item.costDate) },
              { key: 'channel', label: '投放渠道' },
              { key: 'amount', label: '消耗金额', render: (item) => formatCurrency(item.amount) },
              { key: 'isDelayed', label: '是否延迟', render: (item) => item.isDelayed ? (
                <span className="badge bg-red-50 text-red-700 border border-red-200">是</span>
              ) : (
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">否</span>
              )},
              { key: 'remark', label: '备注' },
            ]
          )}
          
          {activeTab === 'flows' && renderDataTable<Flow>(
            relatedFlows,
            [
              { key: 'flowDate', label: '流水日期', render: (item) => formatDateStr(item.flowDate) },
              { key: 'userSource', label: '用户来源' },
              { key: 'amount', label: '充值金额', render: (item) => formatCurrency(item.amount) },
              { key: 'orderNo', label: '订单号' },
            ]
          )}
          
          {activeTab === 'payments' && renderDataTable<Payment>(
            relatedPayments,
            [
              { key: 'paymentDate', label: '回款日期', render: (item) => formatDateStr(item.paymentDate) },
              { key: 'channel', label: '回款渠道' },
              { key: 'amount', label: '回款金额', render: (item) => formatCurrency(item.amount) },
              { key: 'isSplit', label: '是否拆分', render: (item) => item.isSplit ? (
                <span className="badge bg-purple-50 text-purple-700 border border-purple-200">是</span>
              ) : (
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">否</span>
              )},
              { key: 'remark', label: '备注', render: (item) => item.isSplit && item.splitFrom ? `拆分自: ${item.splitFrom}` : item.remark },
            ]
          )}
        </div>
      </div>
      
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800 font-serif">变动影响链</h2>
          <span className="text-sm font-normal text-gray-400">（谁改动了什么，影响了谁）</span>
        </div>
        
        {relatedChanges.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无影响本次测算的变动记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {relatedChanges.map((change, index) => {
                const isExpanded = expandedChangeId === change.id;
                const Icon = getExceptionIcon(change.fieldName.includes('cost') ? 'cost_delay' : 'data_missing');
                
                return (
                  <div key={change.id} className="relative">
                    <div 
                      className={`w-72 bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                        isExpanded ? 'border-primary-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleChangeExpand(change.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getExceptionColor(change.fieldName.includes('cost') ? 'cost_delay' : 'data_missing')}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{formatDateFull(change.createdAt)}</p>
                            <p className="text-sm font-medium text-gray-800">{change.operator}</p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        修改了 <span className="font-medium text-primary-600">{change.fieldName}</span>
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <span className="text-red-500 line-through">{change.oldValue}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="text-emerald-600 font-medium">{change.newValue}</span>
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        原因：{change.changeReason}
                      </p>
                      
                      {change.affectedCalculations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-primary-600">
                            影响 {change.affectedCalculations.length} 份测算
                          </p>
                        </div>
                      )}
                      
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-2">
                            <User className="w-3 h-3 inline mr-1" />
                            操作人：{change.operator}
                          </p>
                          <p className="text-xs text-gray-500 mb-2">
                            <Clock className="w-3 h-3 inline mr-1" />
                            操作时间：{formatDateTime(change.createdAt)}
                          </p>
                          <p className="text-xs text-gray-500">
                            变更编号：{change.id}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {index < relatedChanges.length - 1 && (
                      <div className="absolute top-1/2 -right-4 transform -translate-y-1/2">
                        <ArrowRight className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-800 font-serif">异常列表</h2>
            <span className="text-sm font-normal text-gray-400">（关联测算的所有异常）</span>
          </div>
          <button
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            onClick={() => navigate('/exceptions')}
          >
            查看全部异常
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {exceptions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>本次测算暂无异常</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.map(exc => {
              const ExcIcon = getExceptionIcon(exc.type);
              return (
                <div 
                  key={exc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-primary-200 transition-colors cursor-pointer"
                  onClick={() => navigate('/exceptions')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getExceptionColor(exc.type)}`}>
                      <ExcIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">{EXCEPTION_TYPE_LABELS[exc.type]}</p>
                        <StatusBadge status={exc.severity} type="exception-severity" />
                        <StatusBadge status={exc.status} type="exception-status" />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{exc.blockPoint}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <Modal
        isOpen={showCalcModal}
        onClose={() => setShowCalcModal(false)}
        title="重新测算"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              为剧集 <span className="font-medium text-gray-800">{series.name}</span> 重新测算
            </p>
            <p className="text-xs text-gray-500 mt-1">
              当前版本：v{calculation.version}，重新测算后版本号将自动递增
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">开始日期</label>
              <input
                type="date"
                className="input"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="label">结束日期</label>
              <input
                type="date"
                className="input"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn-secondary"
              onClick={() => setShowCalcModal(false)}
            >
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleRecalc}
              disabled={!periodStart || !periodEnd || isCalculating}
            >
              {isCalculating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  测算中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  重新测算
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
