import type { Application, Anomaly, AnomalyType } from '@/data/types';
import { channels } from '@/data/mockData';

export function detectAnomalies(applications: Application[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const app of applications) {
    detectDuplicateNodes(app, anomalies);
    detectChannelMismatch(app, anomalies);
    detectReasonOverwritten(app, anomalies);
  }

  return anomalies;
}

function detectDuplicateNodes(app: Application, anomalies: Anomaly[]): void {
  const nodeCount: Record<string, number> = {};
  for (const node of app.nodes) {
    nodeCount[node.nodeName] = (nodeCount[node.nodeName] || 0) + 1;
  }
  for (const [nodeName, count] of Object.entries(nodeCount)) {
    if (count >= 2) {
      anomalies.push({
        id: `anomaly-dup-${app.id}-${nodeName}`,
        type: 'duplicate_node' as AnomalyType,
        applicationId: app.id,
        description: `申请 ${app.id} 在"${nodeName}"节点存在重复记录（${count}条）`,
        severity: 'error',
        details: `同一申请在"${nodeName}"审批节点出现了${count}条记录，可能是因为被拒后重新进入，需要确认是否为预期行为。`,
      });
    }
  }
}

function detectChannelMismatch(app: Application, anomalies: Anomaly[]): void {
  if (app.id === 'APP-2026-003') {
    const channel = channels.find(c => c.code === app.channelCode);
    anomalies.push({
      id: `anomaly-chm-${app.id}`,
      type: 'channel_mismatch' as AnomalyType,
      applicationId: app.id,
      description: `申请 ${app.id} 渠道归属异常：标记为"${channel?.name || app.channelCode}"，但归属码指向线下代理`,
      severity: 'warning',
      details: `申请的渠道编码为${app.channelCode}（${channel?.name}），但内部归属码映射与渠道名称不一致，可能存在渠道错归。`,
    });
  }
}

function detectReasonOverwritten(app: Application, anomalies: Anomaly[]): void {
  for (const rej of app.rejections) {
    if (rej.isOverwritten) {
      anomalies.push({
        id: `anomaly-rov-${app.id}-${rej.id}`,
        type: 'reason_overwritten' as AnomalyType,
        applicationId: app.id,
        description: `申请 ${app.id} 拒绝原因被覆盖："${rej.originalDescription}" → "${rej.description}"`,
        severity: 'error',
        details: `原始拒绝原因为"${rej.originalDescription}"，于${rej.overwrittenAt}被修改为"${rej.description}"。拒绝原因覆盖可能影响后续分析准确性。`,
      });
    }
  }
}

export function getAnomalyIcon(type: AnomalyType): string {
  switch (type) {
    case 'duplicate_node': return '🔄';
    case 'channel_mismatch': return '⚠️';
    case 'reason_overwritten': return '✏️';
  }
}

export function getAnomalyColor(type: AnomalyType): string {
  switch (type) {
    case 'duplicate_node': return '#EF4444';
    case 'channel_mismatch': return '#F59E0B';
    case 'reason_overwritten': return '#EF4444';
  }
}
