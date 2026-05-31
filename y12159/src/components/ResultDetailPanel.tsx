import type { JudgmentResult } from '@/types';
import { X, AlertTriangle, Info, TrendingUp, MapPin, Clock, FileText } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

interface ResultDetailPanelProps {
  result: JudgmentResult | null;
  onClose: () => void;
}

const anomalyTypeLabels: Record<string, string> = {
  DRIFT: '传感器漂移',
  SPEED_SUDDEN_CHANGE: '速度突变',
  MISSING: '区段缺失',
  GAP_ABNORMAL: '间隙异常',
};

export default function ResultDetailPanel({ result, onClose }: ResultDetailPanelProps) {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-industrial-panel border-l border-industrial-border/20 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 bg-industrial-panel border-b border-industrial-border/20 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold">区段详情</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-industrial-border/10 rounded-sm transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div className="industrial-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-mono font-bold">{result.sectionId}</h3>
                <p className="text-sm text-industrial-muted">车厢编号: {result.carNumber}</p>
              </div>
              <StatusBadge status={result.status} className="text-sm px-3 py-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-industrial-bg rounded-sm">
                <p className="text-xs text-industrial-muted mb-1">间隙值</p>
                <p className="text-2xl font-mono font-bold">
                  {isNaN(result.gapValue) ? '--' : result.gapValue.toFixed(3)}
                  <span className="text-sm font-normal text-industrial-muted ml-1">mm</span>
                </p>
              </div>
              <div className="text-center p-3 bg-industrial-bg rounded-sm">
                <p className="text-xs text-industrial-muted mb-1">数据来源</p>
                <p className="text-lg font-medium">
                  {result.hasSpeedData ? (
                    <span className="text-success">完整数据</span>
                  ) : (
                    <span className="text-warning">仅间隙数据</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="industrial-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-primary" />
              <h4 className="font-medium">判定信息</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-industrial-muted">阈值版本</span>
                <span className="font-mono">{result.thresholdVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-industrial-muted">单位</span>
                <span className="font-mono">{result.unit}</span>
              </div>
              <div className="pt-2 border-t border-industrial-border/10">
                <p className="text-industrial-muted mb-1">适用范围</p>
                <p className="text-sm">{result.applicableScope}</p>
              </div>
            </div>
          </div>

          {result.failureReason && (
            <div className="industrial-card p-4 border-l-4 border-danger">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-danger" />
                <h4 className="font-medium text-danger">失败原因</h4>
              </div>
              <p className="text-sm">{result.failureReason}</p>
            </div>
          )}

          <div className="industrial-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-warning" />
              <h4 className="font-medium">异常检测</h4>
            </div>
            {result.anomalies.length === 0 ? (
              <p className="text-sm text-industrial-muted">未检测到异常</p>
            ) : (
              <div className="space-y-2">
                {result.anomalies.map((anomaly, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-sm border',
                      anomaly.severity === 'HIGH'
                        ? 'bg-danger/5 border-danger/20'
                        : anomaly.severity === 'MEDIUM'
                        ? 'bg-warning/5 border-warning/20'
                        : 'bg-primary/5 border-primary/20'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{anomalyTypeLabels[anomaly.type] || anomaly.type}</span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded-sm',
                        anomaly.severity === 'HIGH'
                          ? 'bg-danger/20 text-danger'
                          : anomaly.severity === 'MEDIUM'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-primary/20 text-primary'
                      )}>
                        {anomaly.severity === 'HIGH' ? '高' : anomaly.severity === 'MEDIUM' ? '中' : '低'}
                      </span>
                    </div>
                    <p className="text-xs text-industrial-muted">{anomaly.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-industrial-muted">
                      <Clock size={12} />
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="industrial-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-primary" />
              <h4 className="font-medium">建议措施</h4>
            </div>
            <div className="space-y-2 text-sm">
              {result.status === 'PASS' && (
                <p className="text-success">区段运行正常，按计划进行常规巡检即可。</p>
              )}
              {result.status === 'WARNING' && (
                <ul className="list-disc list-inside space-y-1 text-warning">
                  <li>密切关注该区段间隙值变化趋势</li>
                  <li>下次巡检时重点检查传感器校准状态</li>
                  <li>如存在速度突变，确认是否为正常运营调整</li>
                </ul>
              )}
              {result.status === 'FAIL' && (
                <ul className="list-disc list-inside space-y-1 text-danger">
                  <li>立即安排检修人员现场检查</li>
                  <li>检查轨道平整度和悬浮控制系统</li>
                  <li>校准传感器，排除数据误差</li>
                  <li>生成检修工单，限期48小时内完成</li>
                </ul>
              )}
              {result.status === 'MISSING' && (
                <ul className="list-disc list-inside space-y-1 text-industrial-muted">
                  <li>检查数据采集系统是否正常运行</li>
                  <li>确认传感器通信连接状态</li>
                  <li>补采缺失区段数据后重新判定</li>
                </ul>
              )}
            </div>
          </div>

          <div className="industrial-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-primary" />
              <h4 className="font-medium">区段信息</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-industrial-muted">判定时间</span>
                <span>{new Date(result.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-industrial-muted">结果哈希</span>
                <span className="font-mono text-xs">{result.id.slice(0, 16)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
