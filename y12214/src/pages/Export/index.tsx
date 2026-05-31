import { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import DataCard from '@/components/DataCard';
import { formatCurrency, formatPercent, formatDateStr } from '@/utils/format';
import { exportCalculations, exportExceptions, exportSeriesDetail } from '@/utils/export';
import type { Calculation, Exception, Series } from '@/types';
import { EXCEPTION_TYPE_LABELS, EXCEPTION_SEVERITY_LABELS, EXCEPTION_STATUS_LABELS, CALCULATION_STATUS_LABELS } from '@/types';
import { 
  FileText, 
  Download, 
  Calendar, 
  Film, 
  Filter, 
  Calculator, 
  AlertTriangle, 
  Database,
  CheckCircle,
  Info,
  ChevronRight
} from 'lucide-react';

type ReportType = 'calculation' | 'exception' | 'series';

export default function Export() {
  const { 
    calculations, 
    exceptions, 
    series,
    getSeriesById,
    getCalculationById,
    getSeriesCosts,
    getSeriesFlows,
    getSeriesPayments,
    getSeriesCalculations,
    getSeriesMap,
    getCalculationMap
  } = useAppStore();
  
  const [reportType, setReportType] = useState<ReportType>('calculation');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<string[]>([]);
  
  const reportTypes: { key: ReportType; label: string; icon: React.ElementType; description: string }[] = [
    { key: 'calculation', label: '测算报表', icon: Calculator, description: '包含所有测算结果数据' },
    { key: 'exception', label: '异常报表', icon: AlertTriangle, description: '包含所有异常记录数据' },
    { key: 'series', label: '剧集明细报表', icon: Database, description: '包含剧集及关联的所有数据' },
  ];
  
  const filteredCalculations = useMemo(() => {
    return calculations.filter(calc => {
      const matchesDate = (!dateStart || calc.periodEnd >= dateStart) && (!dateEnd || calc.periodStart <= dateEnd);
      const matchesSeries = selectedSeriesIds.length === 0 || selectedSeriesIds.includes(calc.seriesId);
      return matchesDate && matchesSeries;
    }).sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
  }, [calculations, dateStart, dateEnd, selectedSeriesIds]);
  
  const filteredExceptions = useMemo(() => {
    return exceptions.filter(exc => {
      const calc = getCalculationById(exc.calculationId);
      if (!calc) return false;
      const matchesDate = (!dateStart || exc.createdAt >= dateStart) && (!dateEnd || exc.createdAt <= dateEnd);
      const matchesSeries = selectedSeriesIds.length === 0 || selectedSeriesIds.includes(calc.seriesId);
      return matchesDate && matchesSeries;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [exceptions, dateStart, dateEnd, selectedSeriesIds, getCalculationById]);
  
  const filteredSeries = useMemo(() => {
    return series.filter(s => {
      return selectedSeriesIds.length === 0 || selectedSeriesIds.includes(s.id);
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [series, selectedSeriesIds]);
  
  const previewData = useMemo(() => {
    if (reportType === 'calculation') {
      return filteredCalculations.map(calc => {
        const s = getSeriesById(calc.seriesId);
        return {
          id: calc.id,
          seriesName: s?.name || '未知',
          period: `${formatDateStr(calc.periodStart)} ~ ${formatDateStr(calc.periodEnd)}`,
          totalCost: calc.totalCost,
          totalFlow: calc.totalFlow,
          totalPayment: calc.totalPayment,
          recoveryRate: calc.recoveryRate,
          profit: calc.profit,
          status: calc.status,
          version: calc.version,
        };
      });
    }
    
    if (reportType === 'exception') {
      return filteredExceptions.map(exc => {
        const calc = getCalculationById(exc.calculationId);
        const s = calc ? getSeriesById(calc.seriesId) : undefined;
        return {
          id: exc.id,
          seriesName: s?.name || '未知',
          type: exc.type,
          severity: exc.severity,
          status: exc.status,
          blockPoint: exc.blockPoint,
          createdAt: exc.createdAt,
        };
      });
    }
    
    if (reportType === 'series') {
      return filteredSeries.map(s => {
        const calcs = getSeriesCalculations(s.id);
        const costs = getSeriesCosts(s.id);
        const flows = getSeriesFlows(s.id);
        const payments = getSeriesPayments(s.id);
        const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);
        const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
        return {
          id: s.id,
          name: s.name,
          episodes: s.episodes,
          productionCost: s.productionCost,
          authorization: s.authorization,
          status: s.status,
          totalCost,
          totalPayment,
          calcCount: calcs.length,
          costCount: costs.length,
          flowCount: flows.length,
          paymentCount: payments.length,
        };
      });
    }
    
    return [];
  }, [reportType, filteredCalculations, filteredExceptions, filteredSeries, getSeriesById, getCalculationById, getSeriesCalculations, getSeriesCosts, getSeriesFlows, getSeriesPayments]);
  
  const handleSeriesToggle = (seriesId: string) => {
    setSelectedSeriesIds(prev => 
      prev.includes(seriesId) 
        ? prev.filter(id => id !== seriesId)
        : [...prev, seriesId]
    );
  };
  
  const handleSelectAllSeries = () => {
    if (selectedSeriesIds.length === series.length) {
      setSelectedSeriesIds([]);
    } else {
      setSelectedSeriesIds(series.map(s => s.id));
    }
  };
  
  const handleExport = () => {
    if (reportType === 'calculation') {
      const seriesMap = getSeriesMap();
      exportCalculations(filteredCalculations, seriesMap);
    } else if (reportType === 'exception') {
      const calcMap = getCalculationMap();
      const seriesMap = getSeriesMap();
      exportExceptions(filteredExceptions, calcMap, seriesMap);
    } else if (reportType === 'series') {
      filteredSeries.forEach(s => {
        const calcs = getSeriesCalculations(s.id);
        const costs = getSeriesCosts(s.id);
        const flows = getSeriesFlows(s.id);
        const payments = getSeriesPayments(s.id);
        exportSeriesDetail(s, calcs, costs, flows, payments);
      });
    }
  };
  
  const clearFilters = () => {
    setDateStart('');
    setDateEnd('');
    setSelectedSeriesIds([]);
  };
  
  const canExport = previewData.length > 0;
  const totalRecords = previewData.length;
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">报表导出</h1>
          <p className="text-gray-500 mt-1">导出各类业务报表，支持筛选和预览</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={handleExport}
          disabled={!canExport}
        >
          <Download className="w-4 h-4" />
          导出 {totalRecords} 条数据
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportTypes.map(rt => {
          const Icon = rt.icon;
          const isActive = reportType === rt.key;
          return (
            <div
              key={rt.key}
              className={`card cursor-pointer transition-all ${
                isActive ? 'border-primary-300 ring-2 ring-primary-100' : 'hover:border-primary-200'
              }`}
              onClick={() => setReportType(rt.key)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${isActive ? 'text-primary-600' : 'text-gray-800'}`}>
                    {rt.label}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{rt.description}</p>
                </div>
                {isActive && (
                  <CheckCircle className="w-5 h-5 text-primary-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                筛选条件
              </h3>
              <button
                className="text-xs text-primary-600 hover:text-primary-700"
                onClick={clearFilters}
              >
                清空筛选
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  时间范围
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    className="input text-sm"
                    value={dateStart}
                    onChange={e => setDateStart(e.target.value)}
                    placeholder="开始日期"
                  />
                  <p className="text-center text-xs text-gray-400">至</p>
                  <input
                    type="date"
                    className="input text-sm"
                    value={dateEnd}
                    onChange={e => setDateEnd(e.target.value)}
                    placeholder="结束日期"
                  />
                </div>
              </div>
              
              <div>
                <label className="label">
                  <Film className="w-3.5 h-3.5 inline mr-1" />
                  剧集范围
                </label>
                <button
                  className="w-full text-left text-xs text-primary-600 hover:text-primary-700 mb-2"
                  onClick={handleSelectAllSeries}
                >
                  {selectedSeriesIds.length === series.length ? '取消全选' : '全选'}
                  <span className="text-gray-400 ml-1">
                    ({selectedSeriesIds.length}/{series.length} 已选)
                  </span>
                </button>
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {series.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSeriesIds.includes(s.id)}
                        onChange={() => handleSeriesToggle(s.id)}
                        className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-400"
                      />
                      <span className="text-sm text-gray-700 truncate">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="card bg-blue-50 border-blue-100">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">数据口径说明</p>
                <p className="text-blue-600">
                  报表数据与日常测算口径完全一致，数据来源相同，确保复核时数据可追溯、可对比。
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                数据预览
                <span className="text-sm font-normal text-gray-400">
                  共 {totalRecords} 条记录
                </span>
              </h3>
            </div>
            
            {reportType === 'calculation' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header">剧集名称</th>
                      <th className="table-header">测算周期</th>
                      <th className="table-header">总成本</th>
                      <th className="table-header">充值流水</th>
                      <th className="table-header">渠道回款</th>
                      <th className="table-header">回收率</th>
                      <th className="table-header">利润</th>
                      <th className="table-header">版本</th>
                      <th className="table-header">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="table-cell font-medium">{item.seriesName}</td>
                        <td className="table-cell text-gray-500 text-sm">{item.period}</td>
                        <td className="table-cell">{formatCurrency(item.totalCost)}</td>
                        <td className="table-cell text-blue-600">{formatCurrency(item.totalFlow)}</td>
                        <td className="table-cell text-emerald-600 font-medium">{formatCurrency(item.totalPayment)}</td>
                        <td className="table-cell">
                          <span className={item.recoveryRate >= 0.5 ? 'text-emerald-600' : 'text-amber-600'}>
                            {formatPercent(item.recoveryRate)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={item.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                            {item.profit >= 0 ? '+' : ''}{formatCurrency(item.profit)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">v{item.version}</span>
                        </td>
                        <td className="table-cell">
                          <StatusBadge status={item.status} type="calculation" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {reportType === 'exception' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header">关联剧集</th>
                      <th className="table-header">异常类型</th>
                      <th className="table-header">优先级</th>
                      <th className="table-header">状态</th>
                      <th className="table-header">卡点位置</th>
                      <th className="table-header">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="table-cell font-medium">{item.seriesName}</td>
                        <td className="table-cell">
                          <StatusBadge status={item.type} type="exception-type" />
                        </td>
                        <td className="table-cell">
                          <StatusBadge status={item.severity} type="exception-severity" />
                        </td>
                        <td className="table-cell">
                          <StatusBadge status={item.status} type="exception-status" />
                        </td>
                        <td className="table-cell text-gray-600 max-w-xs truncate">{item.blockPoint}</td>
                        <td className="table-cell text-gray-500 text-sm">{formatDateStr(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {reportType === 'series' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header">剧集名称</th>
                      <th className="table-header">集数</th>
                      <th className="table-header">制作成本</th>
                      <th className="table-header">授权方</th>
                      <th className="table-header">累计消耗</th>
                      <th className="table-header">累计回款</th>
                      <th className="table-header">测算次数</th>
                      <th className="table-header">数据明细</th>
                      <th className="table-header">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="table-cell font-medium">{item.name}</td>
                        <td className="table-cell">{item.episodes} 集</td>
                        <td className="table-cell">{formatCurrency(item.productionCost)}</td>
                        <td className="table-cell text-gray-600 truncate">{item.authorization}</td>
                        <td className="table-cell text-red-500">{formatCurrency(item.totalCost)}</td>
                        <td className="table-cell text-emerald-600 font-medium">{formatCurrency(item.totalPayment)}</td>
                        <td className="table-cell">{item.calcCount} 次</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">消耗 {item.costCount}</span>
                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">流水 {item.flowCount}</span>
                            <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">回款 {item.paymentCount}</span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <StatusBadge status={item.status} type="calculation" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {previewData.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无符合条件的数据</p>
                <p className="text-sm mt-1">请调整筛选条件后重试</p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <DataCard
              title="测算记录数"
              value={reportType === 'calculation' ? filteredCalculations.length : calculations.length}
              icon={Calculator}
              iconBg="bg-primary-50"
              className="animate-stagger-1"
            />
            <DataCard
              title="异常记录数"
              value={reportType === 'exception' ? filteredExceptions.length : exceptions.length}
              icon={AlertTriangle}
              iconBg="bg-amber-50"
              className="animate-stagger-2"
            />
            <DataCard
              title="剧集数量"
              value={reportType === 'series' ? filteredSeries.length : series.length}
              icon={Film}
              iconBg="bg-emerald-50"
              className="animate-stagger-3"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
