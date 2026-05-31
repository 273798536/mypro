import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Download, Package, Edit3, AlertTriangle, Zap, Battery, Wind, MapPin, Clock, User, FileText } from 'lucide-react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import RiskBadge from '@/components/RiskBadge';
import EnergyChart from '@/components/EnergyChart';
import { cn } from '@/lib/utils';

const riskTypeLabels: Record<string, string> = {
  headwind_sudden_change: '逆风突变',
  battery_aging: '电池老化',
  no_fly_zone_detour: '禁飞区绕行',
  insufficient_battery: '电量不足',
  payload_exceed: '载荷超限',
  wind_exceed_limit: '风速超限',
  altitude_exceed: '高度超限',
};

export default function CalculationDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const {
    currentTask,
    currentPackages,
    currentCalculation,
    currentCorrections,
    loading,
    error,
    fetchTask,
    fetchPackages,
    fetchCalculation,
    fetchCorrections,
    runCalculation,
    addCorrection,
    fetchReport,
    clearError,
    clearCurrentTask,
  } = useAppStore();

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionParam, setCorrectionParam] = useState('payload');
  const [correctionOldValue, setCorrectionOldValue] = useState('');
  const [correctionNewValue, setCorrectionNewValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'packages' | 'energy' | 'risks' | 'corrections'>('packages');

  useEffect(() => {
    if (taskId) {
      fetchTask(taskId);
      fetchPackages(taskId);
      fetchCalculation(taskId);
      fetchCorrections(taskId);
    }
    return () => {
      clearCurrentTask();
    };
  }, [taskId, fetchTask, fetchPackages, fetchCalculation, fetchCorrections, clearCurrentTask]);

  const handleAddCorrection = async () => {
    if (!taskId || !correctionNewValue || !correctionReason) return;
    await addCorrection(
      taskId,
      correctionParam,
      correctionOldValue || null,
      correctionNewValue,
      correctionReason,
      '航测队长'
    );
    setShowCorrectionModal(false);
    setCorrectionOldValue('');
    setCorrectionNewValue('');
    setCorrectionReason('');
  };

  const handleRunCalculation = async () => {
    if (taskId) {
      await runCalculation(taskId);
    }
  };

  const handleViewReport = async () => {
    if (taskId) {
      await fetchReport(taskId);
      navigate(`/tasks/${taskId}/report`);
    }
  };

  const getPackageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      waypoint_plan: '航点计划',
      payload_weight: '载荷重量',
      wind_field: '风场数据',
      battery: '电池数据',
      mixed: '混合数据包',
    };
    return labels[type] || type;
  };

  const getSafetyScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warningYellow';
    if (score >= 40) return 'text-warning';
    return 'text-red-400';
  };

  if (!currentTask && !loading) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">任务不存在</p>
        <button onClick={() => navigate('/')} className="mt-4 text-accent hover:underline">
          返回任务列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-warning flex-shrink-0" size={20} />
          <div className="flex-1 text-warning">{error}</div>
          <button onClick={clearError} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{currentTask?.name || '加载中...'}</h1>
            {currentTask && <StatusBadge status={currentTask.status} />}
            {currentTask?.isDuplicate && (
              <span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded">
                重复计算
              </span>
            )}
          </div>
          <div className="text-sm text-gray-400">
            {currentTask?.id} · 创建于 {currentTask && new Date(currentTask.createdAt).toLocaleString('zh-CN')}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCorrectionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-warningYellow/10 hover:bg-warningYellow/20 text-warningYellow border border-warningYellow/30 rounded-lg transition-colors"
          >
            <Edit3 size={18} />
            人工修正
          </button>
          <button
            onClick={handleRunCalculation}
            disabled={loading || currentTask?.status === 'calculating'}
            className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accentDark text-primaryDark font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Play size={18} />
            {loading ? '计算中...' : '运行计算'}
          </button>
          {currentTask?.status === 'completed' && (
            <button
              onClick={handleViewReport}
              className="flex items-center gap-2 px-5 py-2 bg-success hover:bg-success/80 text-primaryDark font-medium rounded-lg transition-colors"
            >
              <FileText size={18} />
              查看报告
            </button>
          )}
        </div>
      </div>

      {currentCalculation && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-primary/30 rounded-xl border border-accent/20 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Zap size={16} />
              <span className="text-sm">总能耗需求</span>
            </div>
            <div className="text-2xl font-bold text-accent">
              {currentCalculation.energyModel.totalEnergyRequired.toFixed(2)} Wh
            </div>
          </div>
          <div className="bg-primary/30 rounded-xl border border-accent/20 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Battery size={16} />
              <span className="text-sm">最低电量阈值</span>
            </div>
            <div className="text-2xl font-bold text-warningYellow">
              {currentCalculation.returnThreshold.minBatteryLevel.toFixed(1)}%
            </div>
          </div>
          <div className="bg-primary/30 rounded-xl border border-accent/20 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Shield size={16} />
              <span className="text-sm">安全评分</span>
            </div>
            <div className={cn('text-2xl font-bold', getSafetyScoreColor(currentCalculation.safetyScore))}>
              {currentCalculation.safetyScore.toFixed(0)}/100
            </div>
          </div>
          <div className="bg-primary/30 rounded-xl border border-accent/20 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <AlertTriangle size={16} />
              <span className="text-sm">风险项</span>
            </div>
            <div className="text-2xl font-bold text-warning">
              {currentCalculation.risks.length}
            </div>
          </div>
        </div>
      )}

      <div className="bg-primary/30 rounded-xl border border-accent/20">
        <div className="flex border-b border-accent/20">
          {[
            { key: 'packages', label: '数据包', icon: Package },
            { key: 'energy', label: '能耗模型', icon: Zap },
            { key: 'risks', label: '风险检测', icon: AlertTriangle },
            { key: 'corrections', label: '修正留痕', icon: Edit3 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2',
                  activeTab === tab.key
                    ? 'text-accent border-accent bg-accent/5'
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-accent/5'
                )}
              >
                <Icon size={16} />
                {tab.label}
                {tab.key === 'packages' && currentPackages.length > 0 && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                    {currentPackages.length}
                  </span>
                )}
                {tab.key === 'risks' && currentCalculation?.risks.length ? (
                  <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
                    {currentCalculation.risks.length}
                  </span>
                ) : null}
                {tab.key === 'corrections' && currentCorrections.length > 0 && (
                  <span className="text-xs bg-warningYellow/20 text-warningYellow px-2 py-0.5 rounded">
                    {currentCorrections.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'packages' && (
            <div className="space-y-4">
              {currentPackages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  暂无数据包
                </div>
              ) : (
                currentPackages.map((pkg) => (
                  <div key={pkg.id} className="bg-primaryDark/50 rounded-lg border border-accent/10 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded">
                          {getPackageTypeLabel(pkg.type)}
                        </span>
                        <span className="text-sm text-gray-400">{pkg.id}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(pkg.importedAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">来源: </span>
                        <span className="text-gray-300">{pkg.source}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">导入人: </span>
                        <span className="text-gray-300">{pkg.importedBy}</span>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-black/20 rounded text-xs font-mono text-gray-400 overflow-x-auto">
                      <pre>{JSON.stringify(pkg.content, null, 2).slice(0, 300)}</pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'energy' && (
            <div className="space-y-6">
              {!currentCalculation ? (
                <div className="text-center py-16 text-gray-400">
                  <Zap size={48} className="mx-auto mb-4 opacity-50" />
                  <p>请先运行计算查看能耗模型结果</p>
                </div>
              ) : (
                <>
                  <EnergyChart data={currentCalculation.energyModel.energyCurve} height={350} />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-primaryDark/50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 mb-1">有效距离</div>
                      <div className="text-xl font-semibold text-accent">
                        {currentCalculation.energyModel.effectiveDistance.toFixed(2)} km
                      </div>
                    </div>
                    <div className="bg-primaryDark/50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 mb-1">平均功耗</div>
                      <div className="text-xl font-semibold text-accent">
                        {currentCalculation.energyModel.averagePower.toFixed(2)} W
                      </div>
                    </div>
                    <div className="bg-primaryDark/50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 mb-1">峰值功耗</div>
                      <div className="text-xl font-semibold text-warning">
                        {currentCalculation.energyModel.maxPower.toFixed(2)} W
                      </div>
                    </div>
                    <div className="bg-primaryDark/50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 mb-1">最大安全距离</div>
                      <div className="text-xl font-semibold text-success">
                        {currentCalculation.returnThreshold.maxSafeDistance.toFixed(2)} km
                      </div>
                    </div>
                  </div>

                  {currentCalculation.energyModel.hasWindSuddenChange && (
                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-warning font-medium mb-2">
                        <Wind size={18} />
                        检测到逆风突变
                      </div>
                      <div className="text-sm text-gray-300">
                        突变点: {currentCalculation.energyModel.windSuddenChangePoint?.toFixed(1)} km · 
                        风速增加: {currentCalculation.energyModel.windSpeedIncrease?.toFixed(1)} m/s · 
                        能耗增加: {currentCalculation.energyModel.energyIncreasePercentage?.toFixed(1)}%
                      </div>
                    </div>
                  )}

                  <div className="bg-primaryDark/50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">返航阈值参数</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">返航紧急度: </span>
                        <span className={cn(
                          'font-medium',
                          currentCalculation.returnThreshold.returnUrgency === 'critical' && 'text-warning',
                          currentCalculation.returnThreshold.returnUrgency === 'high' && 'text-warningYellow',
                          currentCalculation.returnThreshold.returnUrgency === 'medium' && 'text-accent',
                          currentCalculation.returnThreshold.returnUrgency === 'low' && 'text-success'
                        )}>
                          {currentCalculation.returnThreshold.returnUrgency === 'critical' && '紧急'}
                          {currentCalculation.returnThreshold.returnUrgency === 'high' && '高'}
                          {currentCalculation.returnThreshold.returnUrgency === 'medium' && '中'}
                          {currentCalculation.returnThreshold.returnUrgency === 'low' && '低'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">距离余量: </span>
                        <span className="text-accent">{currentCalculation.returnThreshold.distanceMargin.toFixed(2)} km</span>
                      </div>
                      <div>
                        <span className="text-gray-500">电量余量: </span>
                        <span className="text-accent">{currentCalculation.returnThreshold.batteryMargin.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'risks' && (
            <div className="space-y-4">
              {!currentCalculation ? (
                <div className="text-center py-16 text-gray-400">
                  <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                  <p>请先运行计算查看风险检测结果</p>
                </div>
              ) : currentCalculation.risks.length === 0 ? (
                <div className="text-center py-16 text-success">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                    ✓
                  </div>
                  <p className="font-medium text-lg">未检测到风险</p>
                  <p className="text-sm text-gray-400 mt-1">所有参数均在安全范围内</p>
                </div>
              ) : (
                currentCalculation.risks.map((risk) => (
                  <div key={risk.id} className={cn(
                    'rounded-lg border p-4',
                    risk.level === 'critical' && 'bg-red-900/20 border-red-600/30',
                    risk.level === 'high' && 'bg-warning/10 border-warning/30',
                    risk.level === 'medium' && 'bg-warningYellow/10 border-warningYellow/30',
                    risk.level === 'low' && 'bg-success/10 border-success/30'
                  )}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <RiskBadge level={risk.level} />
                        <span className="text-sm px-2 py-0.5 bg-accent/10 text-accent rounded">
                          {riskTypeLabels[risk.type] || risk.type}
                        </span>
                      </div>
                      {risk.sourcePackageId && (
                        <span className="text-xs text-gray-500">来源: {risk.sourcePackageId}</span>
                      )}
                    </div>
                    <p className="text-gray-200 mb-2">{risk.message}</p>
                    <p className="text-sm text-gray-400 mb-3">
                      <span className="text-accent">建议: </span>{risk.recommendation}
                    </p>
                    {risk.details && (
                      <div className="p-3 bg-black/20 rounded text-xs font-mono text-gray-400">
                        <pre>{JSON.stringify(risk.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'corrections' && (
            <div className="space-y-4">
              {currentCorrections.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Edit3 size={48} className="mx-auto mb-4 opacity-50" />
                  <p>暂无人工修正记录</p>
                  <p className="text-sm mt-1">点击"人工修正"按钮添加修正</p>
                </div>
              ) : (
                currentCorrections.map((log) => (
                  <div key={log.id} className="bg-primaryDark/50 rounded-lg border border-warningYellow/20 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 bg-warningYellow/10 text-warningYellow rounded">
                          {log.action === 'correction' ? '参数修正' : log.action}
                        </span>
                        <span className="text-sm text-gray-400">{log.id}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">参数: </span>
                        <span className="text-white font-medium">{log.parameter}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">修正人: </span>
                        <span className="text-white">{log.correctedBy}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">原值: </span>
                        <span className="text-warning">{String(log.oldValue)}</span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="text-success">{String(log.newValue)}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-black/20 rounded text-sm text-gray-300">
                      <span className="text-gray-500">原因: </span>{log.reason}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-primary border border-accent/30 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">人工修正参数</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">参数类型</label>
                <select
                  value={correctionParam}
                  onChange={(e) => setCorrectionParam(e.target.value)}
                  className="w-full px-4 py-3 bg-primaryDark border border-accent/20 rounded-lg text-white focus:outline-none focus:border-accent"
                >
                  <option value="payload">载荷重量</option>
                  <option value="wind_speed">风速修正</option>
                  <option value="battery_aging">电池老化因子</option>
                  <option value="safety_margin">安全余量</option>
                  <option value="altitude">飞行高度</option>
                  <option value="speed">飞行速度</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">原值</label>
                  <input
                    type="text"
                    value={correctionOldValue}
                    onChange={(e) => setCorrectionOldValue(e.target.value)}
                    placeholder="选填，如：2.5"
                    className="w-full px-4 py-3 bg-primaryDark border border-accent/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">新值 *</label>
                  <input
                    type="text"
                    value={correctionNewValue}
                    onChange={(e) => setCorrectionNewValue(e.target.value)}
                    placeholder="如：3.0"
                    className="w-full px-4 py-3 bg-primaryDark border border-accent/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">修正原因 *</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="请说明修正原因，如：现场实测载荷与计划不符..."
                  rows={3}
                  className="w-full px-4 py-3 bg-primaryDark border border-accent/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddCorrection}
                disabled={!correctionNewValue || !correctionReason}
                className="px-5 py-2 bg-warningYellow hover:bg-warningYellow/80 text-primaryDark font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                确认修正
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Shield(props: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
