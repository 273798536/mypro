import { useFunnelStore } from '@/store/funnelStore';
import { X, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import type { FunnelLayerData } from '@/data/types';

export default function NodeDetailPanel() {
  const { funnelData, selectedNodeIndex, selectedApplication, selectNode, selectApplication, anomalies } = useFunnelStore();

  if (selectedNodeIndex === null && !selectedApplication) return null;

  const nodeData: FunnelLayerData | undefined = selectedNodeIndex !== null ? funnelData[selectedNodeIndex] : undefined;
  const nodeAnomalies = anomalies.filter(a =>
    selectedApplication
      ? a.applicationId === selectedApplication.id
      : nodeData && a.type === 'duplicate_node' && a.description.includes(nodeData.nodeName)
  );

  return (
    <div className="absolute top-4 right-4 z-20 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="rounded-xl border border-white/10 bg-[#0A1628]/90 backdrop-blur-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white/90">
            {selectedApplication ? `申请 ${selectedApplication.id}` : nodeData ? `${nodeData.nodeName}节点明细` : '节点明细'}
          </span>
          <button
            onClick={() => { selectNode(null); selectApplication(null); }}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {nodeData && (
          <div className="grid grid-cols-3 gap-2">
            <MetricCard label="进入量" value={nodeData.enterCount} color="#4FC3F7" />
            <MetricCard label="通过量" value={nodeData.passCount} color="#66BB6A" />
            <MetricCard label="拒绝量" value={nodeData.rejectCount} color="#EF5350" />
          </div>
        )}

        {nodeData && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
            {nodeData.conversionRate >= 0.8 ? (
              <TrendingUp size={16} className="text-green-400" />
            ) : (
              <TrendingDown size={16} className="text-red-400" />
            )}
            <span className="text-xs text-white/60">转化率</span>
            <span className={`text-sm font-bold ${nodeData.conversionRate >= 0.8 ? 'text-green-400' : 'text-red-400'}`}>
              {(nodeData.conversionRate * 100).toFixed(1)}%
            </span>
          </div>
        )}

        {nodeAnomalies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertTriangle size={12} />
              <span className="font-semibold">异常警告</span>
            </div>
            {nodeAnomalies.map(anomaly => (
              <div
                key={anomaly.id}
                className={`p-2.5 rounded-lg border ${
                  anomaly.severity === 'error'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className={`text-xs font-medium ${anomaly.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                  {anomaly.description}
                </div>
                <div className="text-[10px] text-white/40 mt-1">{anomaly.details}</div>
              </div>
            ))}
          </div>
        )}

        {selectedApplication && (
          <ApplicationDetails app={selectedApplication} />
        )}

        {nodeData && !selectedApplication && (
          <RelatedApplications nodeName={nodeData.nodeName} />
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-white/5 text-center">
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}

function ApplicationDetails({ app }: { app: import('@/data/types').Application }) {
  const channel = app.channelCode;
  const product = app.productCode;

  return (
    <div className="space-y-2 pt-2 border-t border-white/5">
      <div className="text-xs text-white/50 font-medium">申请详情</div>
      <div className="space-y-1.5">
        <DetailRow label="申请人" value={app.applicantName} />
        <DetailRow label="渠道" value={channel} />
        <DetailRow label="产品" value={product} />
        <DetailRow label="状态" value={app.status === 'approved' ? '已通过' : app.status === 'rejected' ? '已拒绝' : '进行中'} />
        <DetailRow label="申请日期" value={app.applyDate} />
      </div>

      {app.rejections.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <div className="text-xs text-white/50 font-medium mb-1.5">拒绝原因</div>
          {app.rejections.map(r => (
            <div key={r.id} className={`p-2 rounded-lg text-xs ${r.isOverwritten ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
              <div className="text-white/70">{r.description}</div>
              {r.isOverwritten && (
                <div className="text-[10px] text-red-400 mt-1">
                  原始原因：{r.originalDescription}（已被覆盖）
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-white/5">
        <div className="text-xs text-white/50 font-medium mb-1.5">审批节点轨迹</div>
        <div className="space-y-1">
          {app.nodes.map((node, i) => (
            <div key={node.id} className="flex items-center gap-2 text-[10px]">
              <div className={`w-1.5 h-1.5 rounded-full ${node.passCount > 0 ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-white/60">{node.nodeName}</span>
              <span className="text-white/30">{node.timestamp}</span>
              {i > 0 && app.nodes[i - 1].nodeName === node.nodeName && (
                <span className="text-red-400 font-medium">[重复]</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-white/40">{label}</span>
      <span className="text-white/70">{value}</span>
    </div>
  );
}

function RelatedApplications({ nodeName }: { nodeName: string }) {
  const { filteredApplications, selectApplication } = useFunnelStore();
  const related = filteredApplications.filter(app =>
    app.nodes.some(n => n.nodeName === nodeName)
  );

  if (related.length === 0) return null;

  return (
    <div className="pt-2 border-t border-white/5">
      <div className="text-xs text-white/50 font-medium mb-1.5">关联申请</div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {related.map(app => (
          <button
            key={app.id}
            onClick={() => selectApplication(app)}
            className="w-full flex items-center justify-between p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-left"
          >
            <span className="text-xs text-white/70">{app.id}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
              app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
              'bg-amber-500/20 text-amber-400'
            }`}>
              {app.status === 'approved' ? '已通过' : app.status === 'rejected' ? '已拒绝' : '进行中'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
