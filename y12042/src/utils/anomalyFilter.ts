import type { AnomalyRecord, AnomalyType } from '../engine/types';

export function filterAnomalies(
  anomalies: AnomalyRecord[],
  type?: AnomalyType,
  onlyUnreviewed: boolean = false
): AnomalyRecord[] {
  return anomalies.filter(a => {
    if (type && a.type !== type) return false;
    if (onlyUnreviewed && a.isReviewed) return false;
    return true;
  });
}

export function groupAnomaliesByType(anomalies: AnomalyRecord[]): {
  short_circuit: AnomalyRecord[];
  low_power: AnomalyRecord[];
  path_blocked: AnomalyRecord[];
} {
  return {
    short_circuit: anomalies.filter(a => a.type === 'short_circuit'),
    low_power: anomalies.filter(a => a.type === 'low_power'),
    path_blocked: anomalies.filter(a => a.type === 'path_blocked'),
  };
}

export function getAnomalyTypeLabel(type: AnomalyType): string {
  const labels: Record<AnomalyType, string> = {
    short_circuit: '短路扩散',
    low_power: '电量不足',
    path_blocked: '路径堵塞',
  };
  return labels[type];
}

export function getAnomalyTypeColor(type: AnomalyType): string {
  const colors: Record<AnomalyType, string> = {
    short_circuit: 'text-danger-red',
    low_power: 'text-warning-amber',
    path_blocked: 'text-warning-amber',
  };
  return colors[type];
}

export function getAnomalyTypeBgColor(type: AnomalyType): string {
  const colors: Record<AnomalyType, string> = {
    short_circuit: 'bg-danger-red/20 border-danger-red/50',
    low_power: 'bg-warning-amber/20 border-warning-amber/50',
    path_blocked: 'bg-warning-amber/20 border-warning-amber/50',
  };
  return colors[type];
}

export function getAnomalyStats(anomalies: AnomalyRecord[]): {
  total: number;
  shortCircuit: number;
  lowPower: number;
  pathBlocked: number;
  reviewed: number;
  unreviewed: number;
} {
  const grouped = groupAnomaliesByType(anomalies);
  return {
    total: anomalies.length,
    shortCircuit: grouped.short_circuit.length,
    lowPower: grouped.low_power.length,
    pathBlocked: grouped.path_blocked.length,
    reviewed: anomalies.filter(a => a.isReviewed).length,
    unreviewed: anomalies.filter(a => !a.isReviewed).length,
  };
}

export function mergeImportedAnomalies(
  existing: AnomalyRecord[],
  imported: any[],
  source: 'fault_card' | 'power_meter'
): AnomalyRecord[] {
  const newAnomalies: AnomalyRecord[] = imported.map((row, index) => {
    let type: AnomalyType = 'short_circuit';
    let description = '';
    let cellIds: string[] = [];

    if (source === 'fault_card') {
      type = row.fault_type === 'overload' ? 'low_power' : 'short_circuit';
      description = `导入故障: ${row.fault_type} (${row.severity}) - ${row.source}`;
      cellIds = [`cell_${row.x}_${row.y}`];
    } else if (source === 'power_meter') {
      type = 'low_power';
      description = `电量记录: ${row.node_id} @ ${row.timestamp}s - ${row.consumption}W`;
      cellIds = [row.node_id];
    }

    return {
      id: `anomaly_imported_${Date.now()}_${index}`,
      type,
      timestamp: row.timestamp || Date.now(),
      cellIds,
      description,
      source: 'imported',
      isReviewed: false,
    };
  });

  return [...existing, ...newAnomalies];
}

export function createAnomalySummary(anomaly: AnomalyRecord): string {
  const typeLabel = getAnomalyTypeLabel(anomaly.type);
  const time = new Date(anomaly.timestamp * 1000).toLocaleTimeString();
  return `[${time}] ${typeLabel}: ${anomaly.description}`;
}

export function getAnomalySeverity(anomaly: AnomalyRecord): 'low' | 'medium' | 'high' {
  if (anomaly.type === 'short_circuit') {
    return anomaly.cellIds.length > 5 ? 'high' : anomaly.cellIds.length > 2 ? 'medium' : 'low';
  }
  if (anomaly.type === 'low_power') {
    return 'medium';
  }
  return 'low';
}

export function sortAnomalies(
  anomalies: AnomalyRecord[],
  sortBy: 'timestamp' | 'type' | 'severity' = 'timestamp'
): AnomalyRecord[] {
  return [...anomalies].sort((a, b) => {
    if (sortBy === 'timestamp') {
      return b.timestamp - a.timestamp;
    }
    if (sortBy === 'type') {
      return a.type.localeCompare(b.type);
    }
    if (sortBy === 'severity') {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[getAnomalySeverity(a)] - severityOrder[getAnomalySeverity(b)];
    }
    return 0;
  });
}
