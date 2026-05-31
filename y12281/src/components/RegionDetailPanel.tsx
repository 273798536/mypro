import { useState } from 'react';
import { X, Database, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { formatCurrency, formatPercent } from '@/utils/colorMapping';
import type { AnomalyStatus } from '@/types';

interface DataSourceItemProps {
  label: string;
  source?: {
    source: string;
    importedAt: string;
    importedBy: string;
    version: string;
  };
}

function DataSourceItem({ label, source }: DataSourceItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => source && setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
        disabled={!source}
      >
        <div className="flex items-center gap-2">
          <Database className={`w-4 h-4 ${source ? 'text-blue-400' : 'text-slate-600'}`} />
          <span className={`text-sm ${source ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
        </div>
        {source ? (
          expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )
        ) : (
          <span className="text-xs text-slate-500">待导入</span>
        )}
      </button>
      {source && expanded && (
        <div className="p-3 bg-slate-900/50 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">来源系统</span>
            <span className="text-slate-300 font-mono">{source.source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">导入时间</span>
            <span className="text-slate-300">{new Date(source.importedAt).toLocaleString('zh-CN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">导入人</span>
            <span className="text-slate-300">{source.importedBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">版本</span>
            <span className="text-slate-300">{source.version}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface AnomalyItemProps {
  anomaly: ReturnType<typeof useAppStore.getState>['anomalies'][0];
  onStatusChange: (status: AnomalyStatus, judgment?: string) => void;
}

function AnomalyItem({ anomaly, onStatusChange }: AnomalyItemProps) {
  const [showJudgment, setShowJudgment] = useState(false);
  const [judgment, setJudgment] = useState('');

  const severityColors = {
    low: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusIcons = {
    pending: <Clock className="w-3 h-3" />,
    confirmed: <AlertTriangle className="w-3 h-3" />,
    resolved: <CheckCircle className="w-3 h-3" />,
    dismissed: <X className="w-3 h-3" />,
  };

  const typeLabels: Record<string, string> = {
    overlap: '区域重叠',
    missing_month: '数据缺失',
    extreme_value: '极端值',
    partial_data: '数据不完整',
  };

  return (
    <div className={`p-3 rounded-lg border ${severityColors[anomaly.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">{typeLabels[anomaly.type]}</span>
            <span className="flex items-center gap-1 text-xs">
              {statusIcons[anomaly.status]}
              {anomaly.status === 'pending' && '待确认'}
              {anomaly.status === 'confirmed' && '已确认'}
              {anomaly.status === 'resolved' && '已处理'}
              {anomaly.status === 'dismissed' && '已忽略'}
            </span>
          </div>
          <p className="text-xs">{anomaly.description}</p>
        </div>
      </div>
      {anomaly.status === 'pending' && (
        <div className="mt-2 flex gap-2">
          {!showJudgment ? (
            <>
              <button
                onClick={() => setShowJudgment(true)}
                className="flex-1 text-xs px-2 py-1 bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 rounded transition-colors"
              >
                确认异常
              </button>
              <button
                onClick={() => onStatusChange('dismissed')}
                className="flex-1 text-xs px-2 py-1 bg-slate-600/50 hover:bg-slate-600 text-slate-300 rounded transition-colors"
              >
                忽略
              </button>
            </>
          ) : (
            <div className="flex-1 space-y-2">
              <textarea
                value={judgment}
                onChange={(e) => setJudgment(e.target.value)}
                placeholder="请输入精算师判断依据..."
                className="w-full text-xs p-2 bg-slate-900/50 border border-slate-600 rounded text-slate-200 placeholder-slate-500 resize-none h-16"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => judgment && onStatusChange('confirmed', judgment)}
                  className="flex-1 text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  提交确认
                </button>
                <button
                  onClick={() => setShowJudgment(false)}
                  className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {anomaly.judgment && (
        <div className="mt-2 pt-2 border-t border-current/20">
          <p className="text-xs text-slate-300">
            <span className="text-slate-500">判断依据：</span>
            {anomaly.judgment}
          </p>
        </div>
      )}
    </div>
  );
}

export default function RegionDetailPanel() {
  const selectedRegionId = useAppStore((state) => state.selectedRegionId);
  const selectRegion = useAppStore((state) => state.selectRegion);
  const regions = useAppStore((state) => state.regions);
  const getCurrentMetrics = useAppStore((state) => state.getCurrentMetrics);
  const getRegionAnomalies = useAppStore((state) => state.getRegionAnomalies);
  const updateAnomalyStatus = useAppStore((state) => state.updateAnomalyStatus);

  const region = regions.find((r) => r.id === selectedRegionId);
  const metrics = region ? getCurrentMetrics(region.id) : undefined;
  const anomalies = region ? getRegionAnomalies(region.id) : [];
  const pendingAnomalies = anomalies.filter((a) => a.status === 'pending');

  if (!region) return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 z-10 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{region.name}</h2>
          <p className="text-xs text-slate-400">
            状态：
            <span className={region.status === 'complete' ? 'text-green-400' : 'text-yellow-400'}>
              {region.status === 'complete' ? '数据完整' : '数据不完整'}
            </span>
          </p>
        </div>
        <button
          onClick={() => selectRegion(null)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            待确认异常 ({pendingAnomalies.length})
          </h3>
          {pendingAnomalies.length > 0 ? (
            <div className="space-y-2">
              {pendingAnomalies.map((anomaly) => (
                <AnomalyItem
                  key={anomaly.id}
                  anomaly={anomaly}
                  onStatusChange={(status, judgment) => updateAnomalyStatus(anomaly.id, status, judgment)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              暂无待确认异常
            </p>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">当前数据</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400 font-mono">
                {metrics?.lossRatio ? formatPercent(metrics.lossRatio) : '--'}
              </p>
              <p className="text-xs text-slate-500 mt-1">赔付率</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-400 font-mono">
                {metrics?.premium ? formatCurrency(metrics.premium) : '--'}
              </p>
              <p className="text-xs text-slate-500 mt-1">保费</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-400 font-mono">
                {metrics?.hazardExposure ? formatPercent(metrics.hazardExposure) : '--'}
              </p>
              <p className="text-xs text-slate-500 mt-1">灾害暴露</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">数据来源追溯</h3>
          <div className="space-y-2">
            <DataSourceItem label="区域边界" source={region.dataSource.boundary} />
            <DataSourceItem label="赔付率数据" source={region.dataSource.lossRatio} />
            <DataSourceItem label="保费数据" source={region.dataSource.premium} />
            <DataSourceItem label="灾害暴露数据" source={region.dataSource.hazardExposure} />
          </div>
        </div>

        {anomalies.filter((a) => a.status !== 'pending').length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">历史异常记录</h3>
            <div className="space-y-2">
              {anomalies
                .filter((a) => a.status !== 'pending')
                .map((anomaly) => (
                  <AnomalyItem
                    key={anomaly.id}
                    anomaly={anomaly}
                    onStatusChange={(status, judgment) => updateAnomalyStatus(anomaly.id, status, judgment)}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
