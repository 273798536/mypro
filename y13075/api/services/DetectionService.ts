import type { SensorRecord, Anomaly, DetectionReason } from '../../shared/types.js';
import { RecordService } from './RecordService.js';
import { AnomalyService } from './AnomalyService.js';

const TEMP_DELTA_THRESHOLD = 5;

function nowISO() { return new Date().toISOString(); }

function groupByRow(records: SensorRecord[]): Map<number, SensorRecord[]> {
  const map = new Map<number, SensorRecord[]>();
  for (const r of records) {
    if (!map.has(r.row)) map.set(r.row, []);
    map.get(r.row)!.push(r);
  }
  // 每一行按 col 排序
  for (const [, arr] of map) arr.sort((a, b) => a.col - b.col);
  return map;
}

function addAnomaly(
  out: Anomaly[],
  record: SensorRecord,
  reason: DetectionReason,
  affected: string[],
) {
  // 避免对同一点位重复创建相同 type 的异常
  const duplicate = out.find(a => a.point_id === record.point_id && a.detection_reason.type === reason.type);
  if (duplicate) return;

  const id = `anm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const now = nowISO();
  out.push({
    id,
    sensor_record_id: record.id,
    point_id: record.point_id,
    status: 'pending',
    detection_reason: reason,
    affected_points: affected,
    remark: '',
    operation_logs: [
      { time: now, action: 'create', operator: 'system', detail: `相邻检测：${reason.type}` },
    ],
    created_at: now,
    updated_at: now,
  });
}

/**
 * 相邻点位检测：
 * - 编号缺口 gap
 * - 温差过大 temp_delta
 * - 重复编号 duplicate
 * - 数值缺失 missing_value
 */
export const DetectionService = {
  runAdjacentDetection(): Anomaly[] {
    const records = RecordService.getAll();
    const found: Anomaly[] = [];

    // 1. 数值缺失（脏数据）
    for (const r of records) {
      if (r.is_dirty) {
        addAnomaly(found, r, {
          type: 'missing_value',
          description: r.dirty_reason || '存在缺失或异常字段',
          detail: {
            temperature: r.temperature,
            humidity: r.humidity,
            reason: r.dirty_reason,
          },
        }, [r.point_id]);
      }
    }

    // 2. 重复编号
    const byPoint = new Map<string, SensorRecord[]>();
    for (const r of records) {
      if (!byPoint.has(r.point_id)) byPoint.set(r.point_id, []);
      byPoint.get(r.point_id)!.push(r);
    }
    for (const [pointId, arr] of byPoint) {
      if (arr.length > 1) {
        const fileNames = [...new Set(arr.map(a => a.raw_source.file_name))];
        const reason: DetectionReason = {
          type: 'duplicate',
          description: `点位编号 ${pointId} 出现 ${arr.length} 条记录（来源：${fileNames.join('、')}）`,
          detail: { count: arr.length, files: fileNames },
        };
        // 找到所有涉及点位的邻近点位组成影响范围
        const cols = arr.map(a => a.col).sort((a, b) => a - b);
        const affected = buildAffected(arr[0].row, cols[0] - 1, cols[cols.length - 1] + 1, arr[0].point_id.split('-')[0]);
        for (const dup of arr) {
          addAnomaly(found, dup, reason, affected);
        }
      }
    }

    // 3. 同行检测：编号缺口 + 温差过大
    const byRow = groupByRow(records);
    for (const [rowNum, arr] of byRow) {
      const zonePrefix = arr[0].point_id.split('-')[0];

      for (let i = 0; i < arr.length - 1; i++) {
        const cur = arr[i];
        const next = arr[i + 1];

        // 编号缺口（相邻记录的 col 差 != 1）
        if (next.col - cur.col > 1) {
          const missing: number[] = [];
          for (let k = cur.col + 1; k < next.col; k++) missing.push(k);
          const reason: DetectionReason = {
            type: 'gap',
            description: `第 ${rowNum} 行 ${cur.point_id} 与 ${next.point_id} 间缺列号：${missing.join(',')}`,
            detail: { missing_cols: missing, cur_col: cur.col, next_col: next.col },
          };
          const affected = [cur.point_id, next.point_id, ...missing.map(c => `${zonePrefix}-${String(rowNum).padStart(2, '0')}-${String(c).padStart(2, '0')}`)];
          addAnomaly(found, cur, reason, affected);
        }

        // 温差过大
        if (cur.temperature !== null && next.temperature !== null) {
          const delta = Math.abs(cur.temperature - next.temperature);
          if (delta > TEMP_DELTA_THRESHOLD) {
            const hot = cur.temperature > next.temperature ? cur : next;
            const cold = cur.temperature > next.temperature ? next : cur;
            const reason: DetectionReason = {
              type: 'temp_delta',
              description: `相邻点 ${cur.point_id}(${cur.temperature}℃) 与 ${next.point_id}(${next.temperature}℃) 温差 ${delta.toFixed(1)}℃，阈值 ${TEMP_DELTA_THRESHOLD}℃`,
              detail: { delta, threshold: TEMP_DELTA_THRESHOLD, hot_point: hot.point_id, cold_point: cold.point_id },
            };
            const affected = buildAffected(rowNum, cur.col - 1, next.col + 1, zonePrefix);
            addAnomaly(found, hot, reason, affected);
          }
        }
      }
    }

    // 持久化（只新增，不覆盖已有）
    if (found.length > 0) {
      AnomalyService.addMany(found);
    }
    return found;
  },
};

function buildAffected(row: number, colStart: number, colEnd: number, prefix: string): string[] {
  const out: string[] = [];
  const r = String(row).padStart(2, '0');
  for (let c = colStart; c <= colEnd; c++) {
    if (c < 1) continue;
    out.push(`${prefix}-${r}-${String(c).padStart(2, '0')}`);
  }
  return out;
}
