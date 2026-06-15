import { useMemo } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Ship,
  Droplets,
  MapPin,
  TrendingUp,
  ArrowRight,
  Download,
  Eye,
  FileText,
  Users,
  Activity,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, getStatistics } from '../mock/data';
import { DataQuality, DATA_QUALITY_LABELS, SHIP_LIST, VIEW_MODES } from '../types';
import StatCard from '../components/StatCard';
import ActionableErrorCard from '../components/ActionableErrorCard';

const DATA_QUALITY_COLORS: Record<DataQuality, string> = {
  available: '#2ECC71',
  approved: '#2ECC71',
  suspended: '#F39C12',
  recollect: '#E74C3C',
  rejected: '#E74C3C',
  pending: '#3E92CC',
  cleaned: '#9B59B6',
  raw: '#64748b',
};

export default function Dashboard() {
  const {
    trackPoints,
    waterQualityData,
    reviewTasks,
    anomalyRecords,
    versionRecords,
    actionableErrors,
    viewMode,
    toggleViewMode,
    addNotification,
  } = useAppStore();

  const stats = useMemo(() => getStatistics(), []);

  const dataQualityStats = useMemo(() => {
    const counts: Record<DataQuality, number> = {
      available: 0,
      approved: 0,
      suspended: 0,
      recollect: 0,
      rejected: 0,
      pending: 0,
      cleaned: 0,
      raw: 0,
    };
    
    trackPoints.forEach(p => {
      counts[p.dataQuality]++;
    });
    
    return counts;
  }, [trackPoints]);

  const pieData = useMemo(() => {
    return [
      { name: '可用', value: dataQualityStats.available, color: DATA_QUALITY_COLORS.available },
      { name: '已通过', value: dataQualityStats.approved, color: DATA_QUALITY_COLORS.approved },
      { name: '暂缓', value: dataQualityStats.suspended, color: DATA_QUALITY_COLORS.suspended },
      { name: '重采', value: dataQualityStats.recollect, color: DATA_QUALITY_COLORS.recollect },
      { name: '已驳回', value: dataQualityStats.rejected, color: DATA_QUALITY_COLORS.rejected },
      { name: '待复核', value: dataQualityStats.pending, color: DATA_QUALITY_COLORS.pending },
      { name: '已清洗', value: dataQualityStats.cleaned, color: DATA_QUALITY_COLORS.cleaned },
      { name: '原始', value: dataQualityStats.raw, color: DATA_QUALITY_COLORS.raw },
    ].filter(d => d.value > 0);
  }, [dataQualityStats]);

  const shipStats = useMemo(() => {
    return SHIP_LIST.map(ship => {
      const shipPoints = trackPoints.filter(p => p.shipId === ship.id);
      const available = shipPoints.filter(p => p.dataQuality === 'available').length;
      const issues = shipPoints.filter(p => 
        p.dataQuality === 'recollect' || p.dataQuality === 'suspended'
      ).length;
      
      return {
        name: ship.name,
        可用: available,
        待处理: issues,
        总计: shipPoints.length,
        completionRate: shipPoints.length > 0 
          ? Math.round((available / shipPoints.length) * 100) 
          : 0,
      };
    });
  }, [trackPoints]);

  const pendingTasks = useMemo(() => 
    reviewTasks.filter(t => t.status === 'pending').sort((a, b) => b.createdAt - a.createdAt),
    [reviewTasks]
  );

  const recentAnomalies = useMemo(() => 
    anomalyRecords.filter(a => !a.resolved).slice(0, 5),
    [anomalyRecords]
  );

  const resultSummary = useMemo(() => {
    const total = trackPoints.length;
    const available = dataQualityStats.available;
    const needsReview = dataQualityStats.pending + dataQualityStats.suspended;
    const needsRecollect = dataQualityStats.recollect;
    
    const availableRate = total > 0 ? Math.round((available / total) * 100) : 0;
    
    return {
      total,
      available,
      needsReview,
      needsRecollect,
      availableRate,
      canDirectUse: availableRate >= 80,
      needsSafetyReview: needsReview > 0,
    };
  }, [trackPoints, dataQualityStats]);

  const handleExportResult = () => {
    addNotification('结果报告导出成功', 'success');
  };

  const handleRefresh = () => {
    addNotification('数据已刷新', 'info');
  };

  const QualityLegend = ({ status, count, label }: { status: DataQuality; count: number; label: string }) => (
    <div className="flex items-center gap-2">
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: DATA_QUALITY_COLORS[status] }}
      />
      <span className="text-xs text-ocean-300">{label}</span>
      <span className="text-xs font-mono font-bold text-ocean-100">{count}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-ocean-gradient bg-grid-pattern bg-grid p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ocean-100">
              {viewMode === 'marine_affairs' ? '结果总览' : '工作台'}
            </h1>
            <p className="text-sm text-ocean-400 mt-1">
              {viewMode === 'marine_affairs' 
                ? '海事处视角 - 数据质量总览和结果分类展示' 
                : '海事安全员视角 - 任务处理和数据清洗工作台'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleViewMode}
              className={`btn-secondary text-xs flex items-center gap-2 ${
                viewMode === 'marine_affairs' 
                  ? 'border-data-pending/50 text-data-pending' 
                  : 'border-ocean-500/50 text-ocean-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              切换到{viewMode === 'marine_affairs' ? '安全员' : '海事处'}视角
            </button>
            <button
              onClick={handleRefresh}
              className="btn-secondary flex items-center gap-2 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              刷新
            </button>
            <button
              onClick={handleExportResult}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出结果报告
            </button>
          </div>
        </div>

        {viewMode === 'marine_affairs' && (
          <div className={`p-4 rounded-xl border ${
            resultSummary.canDirectUse
              ? 'bg-data-available/10 border-data-available/30'
              : 'bg-data-suspended/10 border-data-suspended/30'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                resultSummary.canDirectUse
                  ? 'bg-data-available/20 text-data-available'
                  : 'bg-data-suspended/20 text-data-suspended'
              }`}>
                {resultSummary.canDirectUse ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-display font-bold text-ocean-100 mb-1">
                  {resultSummary.canDirectUse 
                    ? '本批次数据可直接使用' 
                    : '本批次数据需要复核'}
                </h3>
                <p className="text-sm text-ocean-300 mb-3">
                  共 {resultSummary.total} 条轨迹点数据，可用率 {resultSummary.availableRate}%。
                  {resultSummary.canDirectUse ? (
                    <>已通过数据质量校验，可用于海洋碳汇核算。</>
                  ) : (
                    <>存在 {resultSummary.needsReview} 条待复核数据和 {resultSummary.needsRecollect} 条需重采数据，请联系海事安全员处理。</>
                  )}
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-ocean-900/50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-data-available" />
                    <span className="text-sm text-ocean-200">
                      <span className="font-bold text-data-available">{resultSummary.available}</span> 条可直接使用
                    </span>
                  </div>
                  {resultSummary.needsReview > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-ocean-900/50 rounded-lg">
                      <Clock className="w-4 h-4 text-data-pending" />
                      <span className="text-sm text-ocean-200">
                        <span className="font-bold text-data-pending">{resultSummary.needsReview}</span> 条需安全员复核
                      </span>
                    </div>
                  )}
                  {resultSummary.needsRecollect > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-ocean-900/50 rounded-lg">
                      <XCircle className="w-4 h-4 text-data-recollect" />
                      <span className="text-sm text-ocean-200">
                        <span className="font-bold text-data-recollect">{resultSummary.needsRecollect}</span> 条需重新采集
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {actionableErrors.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ocean-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              需处理的问题 ({actionableErrors.length})
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {actionableErrors.slice(0, 2).map(error => (
                <ActionableErrorCard key={error.id} error={error} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-5 gap-4">
          <StatCard
            title="轨迹点总数"
            value={stats.track.total}
            icon={MapPin}
            color="default"
            subtitle={`${stats.track.ships} 艘船舶`}
          />
          <StatCard
            title="可用数据"
            value={dataQualityStats.available}
            icon={CheckCircle}
            color="available"
            trend="up"
            trendValue={`${resultSummary.availableRate}%`}
          />
          <StatCard
            title="待复核"
            value={dataQualityStats.pending}
            icon={Clock}
            color="pending"
            subtitle={`${pendingTasks.length} 个审批任务`}
          />
          <StatCard
            title="需重采"
            value={dataQualityStats.recollect}
            icon={XCircle}
            color="recollect"
          />
          <StatCard
            title="水质监测"
            value={stats.waterQuality.stations}
            icon={Droplets}
            color="default"
            subtitle={`${stats.waterQuality.records} 条记录`}
          />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-4">
            <div className="glass-panel p-4">
              <h3 className="font-medium text-ocean-100 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                数据质量分布
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a1929',
                        border: '1px solid #1e3a5f',
                        borderRadius: '8px',
                        color: '#e8f4fc',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <QualityLegend status="available" count={dataQualityStats.available} label="可用" />
                <QualityLegend status="approved" count={dataQualityStats.approved} label="已通过" />
                <QualityLegend status="pending" count={dataQualityStats.pending} label="待复核" />
                <QualityLegend status="suspended" count={dataQualityStats.suspended} label="暂缓" />
                <QualityLegend status="recollect" count={dataQualityStats.recollect} label="重采" />
                <QualityLegend status="rejected" count={dataQualityStats.rejected} label="已驳回" />
                <QualityLegend status="cleaned" count={dataQualityStats.cleaned} label="已清洗" />
                <QualityLegend status="raw" count={dataQualityStats.raw} label="原始" />
              </div>
            </div>

            <div className="glass-panel p-4">
              <h3 className="font-medium text-ocean-100 mb-4 flex items-center gap-2">
                <Ship className="w-4 h-4" />
                各船舶数据完成度
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shipStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                    <XAxis type="number" stroke="#4a6fa5" tick={{ fill: '#7faed6', fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#4a6fa5" 
                      tick={{ fill: '#7faed6', fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a1929',
                        border: '1px solid #1e3a5f',
                        borderRadius: '8px',
                        color: '#e8f4fc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="可用" stackId="a" fill="#2ECC71" />
                    <Bar dataKey="待处理" stackId="a" fill="#F39C12" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-span-7 space-y-4">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-ocean-100 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  结果说明
                </h3>
                <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  查看完整报告
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-data-available/10 rounded-xl border border-data-available/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-data-available" />
                    <h4 className="font-medium text-ocean-100">可用数据</h4>
                  </div>
                  <p className="text-2xl font-bold font-mono text-data-available mb-1">
                    {dataQualityStats.available}
                  </p>
                  <p className="text-xs text-ocean-400">
                    已通过质量校验，可直接用于碳汇核算
                  </p>
                  <div className="mt-2 pt-2 border-t border-ocean-700/50">
                    <p className="text-[10px] text-ocean-500">包含船舶：</p>
                    <p className="text-xs text-ocean-300">
                      {SHIP_LIST.map(s => s.name).join('、')}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-data-suspended/10 rounded-xl border border-data-suspended/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-data-suspended" />
                    <h4 className="font-medium text-ocean-100">暂缓数据</h4>
                  </div>
                  <p className="text-2xl font-bold font-mono text-data-suspended mb-1">
                    {dataQualityStats.suspended}
                  </p>
                  <p className="text-xs text-ocean-400">
                    存在疑问，需进一步核实后使用
                  </p>
                  <div className="mt-2 pt-2 border-t border-ocean-700/50">
                    <p className="text-[10px] text-ocean-500">主要问题：</p>
                    <p className="text-xs text-ocean-300">
                      坐标漂移、航速异常
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-data-recollect/10 rounded-xl border border-data-recollect/30">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-data-recollect" />
                    <h4 className="font-medium text-ocean-100">需重新采集</h4>
                  </div>
                  <p className="text-2xl font-bold font-mono text-data-recollect mb-1">
                    {dataQualityStats.recollect}
                  </p>
                  <p className="text-xs text-ocean-400">
                    数据质量问题严重，需重新采集
                  </p>
                  <div className="mt-2 pt-2 border-t border-ocean-700/50">
                    <p className="text-[10px] text-ocean-500">主要问题：</p>
                    <p className="text-xs text-ocean-300">
                      深度为负、轨迹断页
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-ocean-900/50 rounded-xl">
                <h4 className="text-sm font-medium text-ocean-100 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-ocean-400" />
                  数据使用建议
                </h4>
                <ul className="space-y-1 text-xs text-ocean-300">
                  <li className="flex items-start gap-2">
                    <span className="text-data-available mt-0.5">•</span>
                    <span><strong className="text-data-available">可用数据</strong>：可直接用于海洋碳汇核算报告，无需额外处理</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-data-pending mt-0.5">•</span>
                    <span><strong className="text-data-pending">待复核数据</strong>：需联系海事安全员确认，复核通过后方可使用</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-data-suspended mt-0.5">•</span>
                    <span><strong className="text-data-suspended">暂缓数据</strong>：建议暂时搁置，待补充完整信息后评估</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-data-recollect mt-0.5">•</span>
                    <span><strong className="text-data-recollect">需重采数据</strong>：数据质量问题严重，请勿使用，需安排船舶重新采集</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-ocean-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-data-pending" />
                    待复核任务
                  </h3>
                  <span className="text-xs text-ocean-400">{pendingTasks.length} 个</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pendingTasks.length === 0 ? (
                    <div className="text-center py-6 text-ocean-400 text-sm">
                      暂无待复核任务
                    </div>
                  ) : (
                    pendingTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className="p-3 bg-ocean-900/50 rounded-lg flex items-center justify-between hover:bg-ocean-800/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusBadge status={task.status} type="review" />
                          <div className="min-w-0">
                            <p className="text-sm text-ocean-100 truncate">{task.title}</p>
                            <p className="text-xs text-ocean-400">
                              {task.submitterName} · {formatDateTime(task.createdAt).slice(5, 16)}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-ocean-500 flex-shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-panel p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-ocean-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-data-recollect" />
                    未处理异常
                  </h3>
                  <span className="text-xs text-ocean-400">
                    {anomalyRecords.filter(a => !a.resolved).length} 个
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentAnomalies.length === 0 ? (
                    <div className="text-center py-6 text-ocean-400 text-sm">
                      暂无未处理异常
                    </div>
                  ) : (
                    recentAnomalies.map(anomaly => {
                      const point = trackPoints.find(p => p.id === anomaly.trackPointId);
                      return (
                        <div
                          key={anomaly.id}
                          className="p-3 bg-ocean-900/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={anomaly.severity} type="severity" />
                            <span className="text-xs text-ocean-400">
                              {point?.shipName}
                            </span>
                          </div>
                          <p className="text-xs text-ocean-200">{anomaly.description}</p>
                          <p className="text-[10px] text-ocean-500 mt-1">
                            {formatDateTime(anomaly.detectedAt).slice(5, 16)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 bg-gradient-to-br from-ocean-600/20 to-ocean-800/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-ocean-500/20 text-ocean-400 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-ocean-100 mb-1">
                当前视角：{VIEW_MODES[viewMode]}
              </h3>
              <p className="text-sm text-ocean-300">
                {viewMode === 'marine_affairs' 
                  ? '作为海事处审批员，您可以查看数据质量总览、审批复核任务、导出结果报告。如需处理数据异常或进行人工修正，请切换到安全员视角。'
                  : '作为海事安全员，您可以处理数据异常、进行轨迹清洗、提交复核任务。如需查看最终结果或进行审批操作，请切换到海事处视角。'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
