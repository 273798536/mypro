import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import DataCard from '@/components/DataCard';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { formatCurrency, formatPercent, formatDateStr } from '@/utils/format';
import { 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Play,
  Search,
  Filter,
  ChevronRight,
  Calendar
} from 'lucide-react';
import type { CalculationStatus } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    calculations, 
    series, 
    exceptions,
    getSeriesById, 
    triggerCalculation 
  } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CalculationStatus | 'all'>('all');
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  
  const stats = useMemo(() => {
    const normal = calculations.filter(c => c.status === 'normal').length;
    const exception = calculations.filter(c => c.status === 'exception').length;
    const pending = calculations.filter(c => c.status === 'pending' || c.status === 'outdated').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCalc = calculations.filter(c => c.calculatedAt.startsWith(today)).length;
    
    return { normal, exception, pending, todayCalc };
  }, [calculations]);
  
  const filteredCalculations = useMemo(() => {
    return calculations
      .filter(calc => {
        const seriesData = getSeriesById(calc.seriesId);
        const matchesSearch = seriesData?.name.includes(searchTerm) ?? false;
        const matchesStatus = statusFilter === 'all' || calc.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
  }, [calculations, searchTerm, statusFilter, getSeriesById]);
  
  const activeSeries = series.filter(s => s.status === 'active');
  
  const handleQuickCalc = async () => {
    if (!selectedSeriesId || !periodStart || !periodEnd) return;
    
    setIsCalculating(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    triggerCalculation(selectedSeriesId, periodStart, periodEnd);
    
    setIsCalculating(false);
    setShowCalcModal(false);
    setSelectedSeriesId('');
    setPeriodStart('');
    setPeriodEnd('');
  };
  
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = today.toISOString().split('T')[0];
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">测算工作台</h1>
          <p className="text-gray-500 mt-1">管理投流回收测算，查看异常状态</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => {
            setPeriodStart(defaultStart);
            setPeriodEnd(defaultEnd);
            setShowCalcModal(true);
          }}
        >
          <Play className="w-4 h-4" />
          新建测算
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          title="正常测算"
          value={stats.normal}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          className="animate-stagger-1"
        />
        <DataCard
          title="有异常"
          value={stats.exception}
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          className="animate-stagger-2"
        />
        <DataCard
          title="待重算"
          value={stats.pending}
          icon={Clock}
          iconBg="bg-blue-50"
          className="animate-stagger-3"
        />
        <DataCard
          title="今日测算"
          value={stats.todayCalc}
          icon={Calculator}
          iconBg="bg-primary-50"
          className="animate-stagger-4"
        />
      </div>
      
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 font-serif">测算记录</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索剧集名称..."
                className="input pl-10 w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="input w-32"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as CalculationStatus | 'all')}
              >
                <option value="all">全部状态</option>
                <option value="normal">正常</option>
                <option value="exception">有异常</option>
                <option value="pending">待重算</option>
                <option value="outdated">已过时</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">剧集名称</th>
                <th className="table-header">测算周期</th>
                <th className="table-header">总成本</th>
                <th className="table-header">已回款</th>
                <th className="table-header">回收率</th>
                <th className="table-header">利润</th>
                <th className="table-header">版本</th>
                <th className="table-header">状态</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalculations.map(calc => {
                const seriesData = getSeriesById(calc.seriesId);
                const hasException = exceptions.some(e => e.calculationId === calc.id && e.status !== 'resolved');
                
                return (
                  <tr 
                    key={calc.id} 
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="table-cell font-medium">{seriesData?.name || '未知'}</td>
                    <td className="table-cell text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateStr(calc.periodStart)} ~ {formatDateStr(calc.periodEnd)}
                      </div>
                    </td>
                    <td className="table-cell">{formatCurrency(calc.totalCost)}</td>
                    <td className="table-cell text-emerald-600 font-medium">{formatCurrency(calc.totalPayment)}</td>
                    <td className="table-cell">
                      <span className={calc.recoveryRate >= 0.5 ? 'text-emerald-600' : 'text-amber-600'}>
                        {formatPercent(calc.recoveryRate)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={calc.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {calc.profit >= 0 ? '+' : ''}{formatCurrency(calc.profit)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">v{calc.version}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={calc.status} type="calculation" />
                        {hasException && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse-soft" />
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <button
                        className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm"
                        onClick={() => navigate(`/calculation/${calc.id}`)}
                      >
                        详情
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredCalculations.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无测算记录</p>
              <p className="text-sm mt-1">点击右上角"新建测算"开始</p>
            </div>
          )}
        </div>
      </div>
      
      <Modal
        isOpen={showCalcModal}
        onClose={() => setShowCalcModal(false)}
        title="新建测算"
      >
        <div className="space-y-4">
          <div>
            <label className="label">选择剧集</label>
            <select
              className="input"
              value={selectedSeriesId}
              onChange={e => setSelectedSeriesId(e.target.value)}
            >
              <option value="">请选择剧集</option>
              {activeSeries.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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
              onClick={handleQuickCalc}
              disabled={!selectedSeriesId || !periodStart || !periodEnd || isCalculating}
            >
              {isCalculating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  测算中...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  开始测算
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
