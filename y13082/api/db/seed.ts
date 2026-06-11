import { db } from './database.js';
import type {
  Batch,
  Point,
  Collision,
  HistoryRecord,
  SavedView,
  AnomalyType,
  DataSource,
} from '../../shared/types.js';

function clean<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === undefined ? null : v;
  }
  return out as T;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

interface RawPointDef {
  objectName: string;
  source: DataSource;
  rawX: string | null;
  rawY: string | null;
  rawZ: string | null;
}

function parseRaw(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

function isDirty(x: string | null, y: string | null, z: string | null): boolean {
  return (
    x === null ||
    x.trim() === '' ||
    y === null ||
    y.trim() === '' ||
    z === null ||
    z.trim() === '' ||
    isNaN(Number(x)) ||
    isNaN(Number(y)) ||
    isNaN(Number(z))
  );
}

function seedBatches(): Batch[] {
  const batches: Batch[] = [
    {
      id: 'batch-001',
      batchNo: 'WH-2026-0610-01',
      warehouseName: '3号危险品库（甲类）',
      status: 'pending',
      totalPoints: 62,
      anomalyCount: 8,
      detectedAt: daysAgo(2),
    },
    {
      id: 'batch-002',
      batchNo: 'WH-2026-0611-02',
      warehouseName: '7号液体化工品库',
      status: 'rejudged',
      totalPoints: 58,
      anomalyCount: 5,
      detectedAt: daysAgo(1),
    },
    {
      id: 'batch-003',
      batchNo: 'WH-2026-0612-03',
      warehouseName: '12号储罐区B区',
      status: 'pending',
      totalPoints: 47,
      anomalyCount: 11,
      detectedAt: daysAgo(0),
    },
  ];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO batches (id, batch_no, warehouse_name, status, total_points, anomaly_count, detected_at)
     VALUES (@id, @batchNo, @warehouseName, @status, @totalPoints, @anomalyCount, @detectedAt)`,
  );
  const tx = db.transaction(() => {
    for (const b of batches) insert.run(clean(b));
  });
  tx();
  return batches;
}

const CHEMICAL_OBJECTS = [
  '硫酸储罐T-101',
  '液氨钢瓶组A',
  '甲醇储罐T-202',
  '黄磷包装桶B-03',
  '氧气瓶排',
  '氯气钢瓶C-17',
  '甲苯中间罐',
  '柴油桶架D-05',
  '硝酸存储柜',
  '电石托盘E-02',
  '乙醇储罐T-301',
  '丙酮桶装区',
  '苯乙烯储罐',
  '压缩天然气瓶组',
  '过氧化氢柜',
  '高锰酸钾货架',
];

function buildBatchPoints(batchId: string, seed: number): RawPointDef[] {
  const pts: RawPointDef[] = [];
  const rand = mulberry32(seed);

  for (let i = 0; i < 45; i++) {
    const obj = CHEMICAL_OBJECTS[i % CHEMICAL_OBJECTS.length] + '-' + String(i + 1).padStart(2, '0');
    const src: DataSource = (['laser_scan', 'laser_scan', 'manual_entry', 'system_import'] as DataSource[])[
      Math.floor(rand() * 4)
    ];
    const x = (2 + rand() * 36).toFixed(2);
    const y = (1 + rand() * 18).toFixed(2);
    const z = (0.5 + rand() * 4).toFixed(2);
    pts.push({ objectName: obj, source: src, rawX: x, rawY: y, rawZ: z });
  }

  if (batchId === 'batch-001') {
    pts.push({
      objectName: '硫酸储罐T-101-重叠A',
      source: 'laser_scan',
      rawX: '12.50',
      rawY: '8.75',
      rawZ: '2.30',
    });
    pts.push({
      objectName: '硫酸储罐T-101-重叠B',
      source: 'manual_entry',
      rawX: '12.50',
      rawY: '8.75',
      rawZ: '2.30',
    });
    pts.push({ objectName: '液氨钢瓶组A-越界', source: 'laser_scan', rawX: '52.30', rawY: '3.20', rawZ: '1.80' });
    pts.push({ objectName: '黄磷包装桶B-03-缺失Z', source: 'manual_entry', rawX: '7.40', rawY: '11.20', rawZ: '' });
    pts.push({ objectName: '氯气钢瓶C-17-格式乱', source: 'system_import', rawX: 'N/A', rawY: '--', rawZ: 'abc' });
    pts.push({ objectName: '柴油桶架D-05-空值', source: 'manual_entry', rawX: null, rawY: null, rawZ: null });
    pts.push({ objectName: '电石托盘E-02-越界Y', source: 'laser_scan', rawX: '18.00', rawY: '25.60', rawZ: '1.50' });
  }

  if (batchId === 'batch-002') {
    pts.push({ objectName: '甲苯中间罐-缺失X', source: 'manual_entry', rawX: '', rawY: '6.50', rawZ: '2.10' });
    pts.push({ objectName: '硝酸存储柜-格式', source: 'system_import', rawX: '未录入', rawY: '14.20', rawZ: '1.90' });
    pts.push({ objectName: '氧气瓶排-越界Z', source: 'laser_scan', rawX: '22.00', rawY: '9.00', rawZ: '7.80' });
  }

  if (batchId === 'batch-003') {
    pts.push({
      objectName: '苯乙烯储罐-重叠X',
      source: 'system_import',
      rawX: '15.80',
      rawY: '12.40',
      rawZ: '3.10',
    });
    pts.push({
      objectName: '苯乙烯储罐-重叠Y',
      source: 'laser_scan',
      rawX: '15.80',
      rawY: '12.40',
      rawZ: '3.10',
    });
    pts.push({ objectName: '压缩天然气瓶组-缺失Y', source: 'manual_entry', rawX: '9.30', rawY: '', rawZ: '2.00' });
    pts.push({ objectName: '过氧化氢柜-格式错', source: 'system_import', rawX: '???', rawY: '7.70', rawZ: '1.70' });
    pts.push({ objectName: '高锰酸钾货架-越界X', source: 'laser_scan', rawX: '-3.20', rawY: '5.00', rawZ: '2.20' });
    pts.push({ objectName: '丙酮桶装区-越界Z', source: 'manual_entry', rawX: '27.00', rawY: '13.00', rawZ: '9.50' });
    pts.push({ objectName: '乙醇储罐-空值', source: 'system_import', rawX: '', rawY: '', rawZ: '' });
    pts.push({ objectName: '黄磷包装桶B-格式乱', source: 'manual_entry', rawX: '待定', rawY: 'TBD', rawZ: 'N/A' });
  }

  return pts;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WAREHOUSE_BOUNDS = {
  batch: { xMin: 0, xMax: 40, yMin: 0, yMax: 20, zMin: 0, zMax: 5 },
};

function seedPoints(batches: Batch[]): Map<string, Point[]> {
  const batchPoints = new Map<string, Point[]>();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO points (id, batch_id, object_name, source, raw_x, raw_y, raw_z, parsed_x, parsed_y, parsed_z, is_dirty, created_at)
     VALUES (@id, @batchId, @objectName, @source, @rawX, @rawY, @rawZ, @parsedX, @parsedY, @parsedZ, @isDirty, @createdAt)`,
  );

  const tx = db.transaction(() => {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const rawDefs = buildBatchPoints(batch.id, 100 + i * 37);
      const points: Point[] = rawDefs.map((def) => {
        const px = parseRaw(def.rawX);
        const py = parseRaw(def.rawY);
        const pz = parseRaw(def.rawZ);
        return {
          id: 'pt-' + uid(),
          batchId: batch.id,
          objectName: def.objectName,
          source: def.source,
          rawX: def.rawX,
          rawY: def.rawY,
          rawZ: def.rawZ,
          parsedX: px,
          parsedY: py,
          parsedZ: pz,
          isDirty: isDirty(def.rawX, def.rawY, def.rawZ),
          createdAt: batch.detectedAt,
        };
      });
      batchPoints.set(batch.id, points);
      for (const p of points) {
        insert.run(clean({
          ...p,
          isDirty: p.isDirty ? 1 : 0,
        }));
      }
    }
  });
  tx();
  return batchPoints;
}

function detectCollisions(batches: Batch[], batchPoints: Map<string, Point[]>): Collision[] {
  const collisions: Collision[] = [];

  for (const batch of batches) {
    const points = batchPoints.get(batch.id) || [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];

      if (p.isDirty) {
        const missing = [p.rawX, p.rawY, p.rawZ].filter((v) => v === null || v.trim() === '').length;
        const badFormat = [p.rawX, p.rawY, p.rawZ].some(
          (v) => v !== null && v.trim() !== '' && isNaN(Number(v)),
        );
        if (missing > 0) {
          collisions.push({
            id: 'col-' + uid(),
            batchId: batch.id,
            type: 'missing_coord',
            pointId: p.id,
            objectA: p.objectName,
            objectB: undefined,
            status: 'needs_review',
            description: `${p.objectName} 存在 ${missing} 个坐标缺失（原始来源：${p.source}）`,
            detectedAt: batch.detectedAt,
          });
        }
        if (badFormat) {
          collisions.push({
            id: 'col-' + uid(),
            batchId: batch.id,
            type: 'format_error',
            pointId: p.id,
            objectA: p.objectName,
            objectB: undefined,
            status: 'needs_review',
            description: `${p.objectName} 坐标格式异常（原始值 X=${p.rawX} Y=${p.rawY} Z=${p.rawZ}，来源：${p.source}）`,
            detectedAt: batch.detectedAt,
          });
        }
        continue;
      }

      const b = WAREHOUSE_BOUNDS.batch;
      if (
        p.parsedX! < b.xMin ||
        p.parsedX! > b.xMax ||
        p.parsedY! < b.yMin ||
        p.parsedY! > b.yMax ||
        p.parsedZ! < b.zMin ||
        p.parsedZ! > b.zMax
      ) {
        collisions.push({
          id: 'col-' + uid(),
          batchId: batch.id,
          type: 'out_of_bounds',
          pointId: p.id,
          objectA: p.objectName,
          status: 'needs_review',
          description: `${p.objectName} 坐标越界（X=${p.rawX} Y=${p.rawY} Z=${p.rawZ}，仓库边界 X[${b.xMin},${b.xMax}] Y[${b.yMin},${b.yMax}] Z[${b.zMin},${b.zMax}]）`,
          detectedAt: batch.detectedAt,
        });
      }

      for (let j = i + 1; j < points.length; j++) {
        const q = points[j];
        if (q.isDirty) continue;
        const dx = Math.abs(p.parsedX! - q.parsedX!);
        const dy = Math.abs(p.parsedY! - q.parsedY!);
        const dz = Math.abs(p.parsedZ! - q.parsedZ!);
        if (dx < 0.05 && dy < 0.05 && dz < 0.05) {
          collisions.push({
            id: 'col-' + uid(),
            batchId: batch.id,
            type: 'overlap',
            pointId: p.id,
            objectA: p.objectName,
            objectB: q.objectName,
            status: 'needs_review',
            description: `对象重叠：${p.objectName}（来源：${p.source}）与 ${q.objectName}（来源：${q.source}）坐标完全重合（X=${p.rawX} Y=${p.rawY} Z=${p.rawZ}），请现场复核是否为误报或真实碰撞`,
            detectedAt: batch.detectedAt,
          });
        }
      }
    }
  }

  const insert = db.prepare(
    `INSERT OR IGNORE INTO collisions (id, batch_id, type, object_a, object_b, point_id, status, description, detected_at)
     VALUES (@id, @batchId, @type, @objectA, @objectB, @pointId, @status, @description, @detectedAt)`,
  );
  const tx = db.transaction(() => {
    for (const c of collisions) {
      insert.run({
        id: c.id,
        batchId: c.batchId,
        type: c.type,
        objectA: c.objectA,
        objectB: c.objectB ?? null,
        pointId: c.pointId ?? null,
        status: c.status,
        description: c.description,
        detectedAt: c.detectedAt,
      });
    }
  });
  tx();
  return collisions;
}

function seedHistory(batches: Batch[]): void {
  const allCols = db.prepare('SELECT * FROM collisions WHERE batch_id = ?').all(batches[1].id) as any[];
  if (allCols.length === 0) return;

  const target = allCols[0];
  const record: HistoryRecord = {
    id: 'hist-' + uid(),
    collisionId: target.id,
    batchId: target.batch_id,
    operator: '方案经理-小赵',
    oldStatus: target.status,
    newStatus: 'false_positive',
    reason: '经现场复核，两桶之间存在 30cm 安全距离，扫描精度误差导致重叠误报。',
    createdAt: daysAgo(0.5),
  };

  db.prepare(
    `INSERT OR IGNORE INTO history_records (id, collision_id, batch_id, operator, old_status, new_status, reason, created_at)
     VALUES (@id, @collisionId, @batchId, @operator, @oldStatus, @newStatus, @reason, @createdAt)`,
  ).run(clean(record));

  db.prepare('UPDATE collisions SET status = ?, rejudged_by = ?, rejudged_reason = ?, rejudged_at = ? WHERE id = ?').run(
    'false_positive',
    record.operator,
    record.reason,
    record.createdAt,
    target.id,
  );
}

function seedViews(): void {
  const views: SavedView[] = [
    {
      id: 'view-001',
      name: '小赵常用视图',
      anomalyTypes: ['overlap', 'out_of_bounds'],
      statusFilter: ['needs_review', 'confirmed'],
      sortBy: 'detectedAt',
      sortOrder: 'desc',
      cameraAngle: 'iso',
      createdBy: '方案经理-小赵',
      createdAt: daysAgo(3),
    },
    {
      id: 'view-002',
      name: '重叠异常优先',
      anomalyTypes: ['overlap'],
      statusFilter: ['needs_review'],
      sortBy: 'type',
      sortOrder: 'asc',
      cameraAngle: 'top',
      createdBy: '方案经理-小赵',
      createdAt: daysAgo(2),
    },
  ];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO saved_views (id, name, anomaly_types, status_filter, sort_by, sort_order, camera_angle, created_by, created_at)
     VALUES (@id, @name, @anomalyTypes, @statusFilter, @sortBy, @sortOrder, @cameraAngle, @createdBy, @createdAt)`,
  );
  const tx = db.transaction(() => {
    for (const v of views) {
      insert.run(clean({
        ...v,
        anomalyTypes: JSON.stringify(v.anomalyTypes),
        statusFilter: JSON.stringify(v.statusFilter),
      }));
    }
  });
  tx();
}

export function runSeed(): void {
  const batchCount = (db.prepare('SELECT COUNT(*) AS c FROM batches').get() as { c: number }).c;
  if (batchCount > 0) return;

  const batches = seedBatches();
  const batchPoints = seedPoints(batches);
  detectCollisions(batches, batchPoints);
  seedHistory(batches);
  seedViews();
}
