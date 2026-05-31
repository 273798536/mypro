import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, AlertTriangle, Zap, Battery, Shield, MapPin, Clock, User, CheckCircle, XCircle, GitBranch } from 'lucide-react';
import { useAppStore } from '@/store';
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

const nodeTypeLabels: Record<string, string> = {
  raw_data: '原始数据',
  calculation_step: '计算步骤',
  correction: '人工修正',
  result: '最终结果',
};

export default function ReportOutput() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { currentReport, currentTask, loading, error, fetchReport, fetchTask, clearError, clearCurrentTask } = useAppStore();
  const [exportFormat, setExportFormat] = useState<'json' | 'text'>('json');
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTask(taskId);
      fetchReport(taskId);
    }
    return () => {
      clearCurrentTask();
    };
  }, [taskId, fetchTask, fetchReport, clearCurrentTask]);

  const handleExport = async () => {
    if (!taskId) return;
    try {
      const response = await fetch(`http://localhost:5001/api/tasks/${taskId}/report/export?format=${exportFormat}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `返航计算报告_${currentTask?.name || taskId}_${new Date().toISOString().slice(0, 10)}.${exportFormat === 'json' ? 'json' : 'txt'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const getSafetyScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warningYellow';
    if (score >= 40) return 'text-warning';
    return 'text-red-400';
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'raw_data': return 'border-accent text-accent bg-accent/10';
      case 'calculation_step': return 'border-blue-400 text-blue-400 bg-blue-400/10';
      case 'correction': return 'border-warningYellow text-warningYellow bg-warningYellow/10';
      case 'result': return 'border-success text-success bg-success/10';
      default: return 'border-gray-500 text-gray-500 bg-gray-500/10';
    }
  };

  if (!currentReport && !loading) {
    return (
      <div className="text-center py-16">
        <FileText size={48} className="mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 mb-4">报告不存在或未生成</p>
        <button onClick={() => navigate('/')} className="text-accent hover:underline">
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
          onClick={() => navigate(`/tasks/${taskId}`)}
          className="p-2 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">返航计算报告</h1>
            <span className="text-sm text-gray-400">{currentTask?.name}</span>
          </div>
          <div className="text-sm text-gray-400">
            生成于 {currentReport && new Date(currentReport.generatedAt).toLocaleString('zh-CN')}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accentDark text-primaryDark font-medium rounded-lg transition-colors"
          >
            <Download size={18} />
            导出报告
          </button>
        </div>
      </div>

      {currentReport && (
        <>
          <div className="bg-gradient-to-r from-primary/50 to-primary/30 rounded-xl border border-accent/20 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield size={20} className="text-accent" />
              总体评估
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-primaryDark/50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">总能耗</div>
                <div className="text-2xl font-bold text-accent">
                  {currentReport.summary.totalEnergy.toFixed(2)}
                  <span className="text-sm ml-1 text-gray-400">Wh</span>
                </div>
              </div>
              <div className="bg-primaryDark/50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">最低电量</div>
                <div className="text-2xl font-bold text-warningYellow">
                  {currentReport.summary.minBatteryLevel.toFixed(1)}
                  <span className="text-sm ml-1 text-gray-400">%</span>
                </div>
              </div>
              <div className="bg-primaryDark/50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">安全评分</div>
                <div className={cn('text-2xl font-bold', getSafetyScoreColor(currentReport.summary.safetyScore))}>
                  {currentReport.summary.safetyScore.toFixed(0)}
                  <span className="text-sm ml-1 text-gray-400">/100</span>
                </div>
              </div>
              <div className="bg-primaryDark/50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">风险项</div>
                <div className="text-2xl font-bold text-warning">
                  {currentReport.summary.riskCount}
                </div>
              </div>
              <div className="bg-primaryDark/50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">严重风险</div>
                <div className="text-2xl font-bold text-red-400">
                  {currentReport.summary.criticalRiskCount}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-primary/30 rounded-xl border border-accent/20 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-success" />
                结论
              </h3>
              <ul className="space-y-3">
                {currentReport.conclusions.map((conclusion, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-accent mt-0.5">{i + 1}.</span>
                    <span className="text-gray-200">{conclusion}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-primary/30 rounded-xl border border-accent/20 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap size={18} className="text-warningYellow" />
                建议措施
              </h3>
              <ul className="space-y-3">
                {currentReport.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-warningYellow mt-0.5">!</span>
                    <span className="text-gray-200">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-primary/30 rounded-xl border border-accent/20 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap size={18} className="text-accent" />
              能耗曲线
            </h3>
            <EnergyChart data={currentReport.energyModel.energyCurve} height={300} />
          </div>

          {currentReport.risks.length > 0 && (
            <div className="bg-primary/30 rounded-xl border border-warning/30 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-warning" />
                风险分析 ({currentReport.risks.length} 项)
              </h3>
              <div className="space-y-3">
                {currentReport.risks.map((risk) => (
                  <div key={risk.id} className={cn(
                    'rounded-lg border p-4',
                    risk.level === 'critical' && 'bg-red-900/20 border-red-600/30',
                    risk.level === 'high' && 'bg-warning/10 border-warning/30',
                    risk.level === 'medium' && 'bg-warningYellow/10 border-warningYellow/30',
                    risk.level === 'low' && 'bg-success/10 border-success/30'
                  )}>
                    <div className="flex items-center gap-3 mb-2">
                      <RiskBadge level={risk.level} size="sm" />
                      <span className="text-sm px-2 py-0.5 bg-accent/10 text-accent rounded">
                        {riskTypeLabels[risk.type] || risk.type}
                      </span>
                      {risk.sourcePackageId && (
                        <span className="text-xs text-gray-500 ml-auto">来源: {risk.sourcePackageId}</span>
                      )}
                    </div>
                    <p className="text-gray-200">{risk.message}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      <span className="text-accent">建议: </span>{risk.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-primary/30 rounded-xl border border-accent/20 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-accent" />
                数据来源
              </h3>
              <div className="space-y-3">
                {currentReport.dataSources.map((src, i) => (
                  <div key={i} className="bg-primaryDark/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded">
                        {src.type}
                      </span>
                      <span className="text-xs text-gray-500">{src.packageId}</span>
                    </div>
                    <div className="text-sm mb-1">
                      <span className="text-gray-500">来源: </span>
                      <span className="text-white">{src.source}</span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono bg-black/20 p-2 rounded">
                      {src.preview}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/30 rounded-xl border border-warningYellow/20 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <GitBranch size={18} className="text-warningYellow" />
                计算追溯链
              </h3>
              <div className="relative">
                {currentReport.calculationTrace.map((node, i) => (
                  <div key={node.id} className="relative pb-4 last:pb-0">
                    {i < currentReport.calculationTrace.length - 1 && (
                      <div className="absolute left-[18px] top-[36px] w-0.5 h-full bg-accent/30" />
                    )}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 mt-0.5',
                        getNodeTypeColor(node.type)
                      )}>
                        {node.type === 'raw_data' && <MapPin size={14} />}
                        {node.type === 'calculation_step' && <Zap size={14} />}
                        {node.type === 'correction' && <User size={14} />}
                        {node.type === 'result' && <CheckCircle size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs px-2 py-0.5 rounded', getNodeTypeColor(node.type))}>
                            {nodeTypeLabels[node.type]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(node.timestamp).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-white">{node.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          值: {typeof node.value === 'object' ? JSON.stringify(node.value).slice(0, 80) : String(node.value)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          来源: {node.source}
                          {node.sourcePackageId && ` (${node.sourcePackageId})`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {currentReport.correctionHistory.length > 0 && (
            <div className="bg-primary/30 rounded-xl border border-warningYellow/20 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User size={18} className="text-warningYellow" />
                人工修正记录 ({currentReport.correctionHistory.length} 项)
              </h3>
              <div className="space-y-3">
                {currentReport.correctionHistory.map((log) => (
                  <div key={log.id} className="bg-primaryDark/50 rounded-lg border border-warningYellow/10 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 bg-warningYellow/10 text-warningYellow rounded">
                          {log.action === 'correction' ? '参数修正' : log.action}
                        </span>
                        <span className="text-sm text-white font-medium">{log.parameter}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="text-sm mb-2">
                      <span className="text-warning">{String(log.oldValue)}</span>
                      <span className="text-gray-500 mx-2">→</span>
                      <span className="text-success">{String(log.newValue)}</span>
                      <span className="text-gray-400 ml-3">· {log.correctedBy}</span>
                    </div>
                    <div className="text-sm text-gray-400 bg-black/20 p-2 rounded">
                      {log.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-primary border border-accent/30 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">导出报告</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">选择格式</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setExportFormat('json')}
                  className={cn(
                    'flex-1 py-3 rounded-lg border transition-colors',
                    exportFormat === 'json'
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-primaryDark border-gray-600 text-gray-400 hover:border-gray-500'
                  )}
                >
                  JSON 格式
                </button>
                <button
                  onClick={() => setExportFormat('text')}
                  className={cn(
                    'flex-1 py-3 rounded-lg border transition-colors',
                    exportFormat === 'text'
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-primaryDark border-gray-600 text-gray-400 hover:border-gray-500'
                  )}
                >
                  文本格式
                </button>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleExport}
                className="px-5 py-2 bg-accent hover:bg-accentDark text-primaryDark font-medium rounded-lg transition-colors"
              >
                下载
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
