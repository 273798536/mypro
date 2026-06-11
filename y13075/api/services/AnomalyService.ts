import type { Anomaly, PointStatus, OperationLog } from '../../shared/types.js';
import { readJSON, writeJSON } from '../storage/FileStorage.js';
import { generateSeed } from './SeedService.js';

const FILE = 'anomalies.json';
const EMPTY: { version: number; anomalies: Anomaly[] } = { version: 1, anomalies: [] };

function read() {
  return readJSON<{ version: number; anomalies: Anomaly[] }>(FILE, EMPTY);
}

function write(data: { version: number; anomalies: Anomaly[] }) {
  writeJSON(FILE, data);
}

function nowISO() { return new Date().toISOString(); }

function pushLog(a: Anomaly, log: OperationLog) {
  a.operation_logs = [...a.operation_logs, log];
  a.updated_at = nowISO();
}

export const AnomalyService = {
  getAll(): Anomaly[] {
    return read().anomalies;
  },

  getById(id: string): Anomaly | undefined {
    return read().anomalies.find(a => a.id === id);
  },

  getBySensorRecordId(recId: string): Anomaly[] {
    return read().anomalies.filter(a => a.sensor_record_id === recId);
  },

  getByPointId(pointId: string): Anomaly[] {
    return read().anomalies.filter(a => a.point_id === pointId);
  },

  addMany(anomalies: Anomaly[]) {
    const data = read();
    const existingIds = new Set(data.anomalies.map(a => a.id));
    const fresh = anomalies.filter(a => !existingIds.has(a.id));
    if (fresh.length === 0) return data.anomalies;
    data.anomalies = [...data.anomalies, ...fresh];
    write(data);
    return data.anomalies;
  },

  updateRemark(id: string, remark: string): Anomaly | null {
    const data = read();
    const target = data.anomalies.find(a => a.id === id);
    if (!target) return null;
    target.remark = remark;
    pushLog(target, {
      time: nowISO(),
      action: 'remark_edit',
      operator: 'operator',
      detail: `更新备注（${remark.length} 字）`,
    });
    write(data);
    return target;
  },

  updateStatus(id: string, status: PointStatus): Anomaly | null {
    const data = read();
    const target = data.anomalies.find(a => a.id === id);
    if (!target) return null;
    const old = target.status;
    target.status = status;
    const action: OperationLog['action'] =
      status === 'confirmed_anomaly' ? 'confirm' :
      status === 'dismissed' ? 'dismiss' : 'status_change';
    pushLog(target, {
      time: nowISO(),
      action,
      operator: 'reviewer',
      detail: `状态变更：${old} → ${status}`,
    });
    write(data);
    return target;
  },

  seedIfEmpty(): { anomalies: Anomaly[]; seeded: boolean } {
    const cur = read();
    if (cur.anomalies.length > 0) {
      return { anomalies: cur.anomalies, seeded: false };
    }
    const { anomalies } = generateSeed();
    write({ version: 1, anomalies });
    return { anomalies, seeded: true };
  },
};
