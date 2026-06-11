import {
  BatchRepository,
  PointRepository,
  CollisionRepository,
  HistoryRepository,
  SavedViewRepository,
} from '../repositories/index.js';
import type {
  Batch,
  BatchDetail,
  Collision,
  CollisionStatus,
  HistoryRecord,
  SavedView,
  AnomalyType,
  RejudgePayload,
} from '../../shared/types.js';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const BatchService = {
  list(status?: string, keyword?: string): Batch[] {
    return BatchRepository.findAll(status as any, keyword);
  },

  getDetail(id: string): BatchDetail | null {
    const batch = BatchRepository.findById(id);
    if (!batch) return null;
    const points = PointRepository.findByBatchId(id);
    const collisions = CollisionRepository.findAll({ batchId: id });
    return { ...batch, points, collisions };
  },

  getPoints(batchId: string) {
    return PointRepository.findByBatchId(batchId);
  },

  getCollisions(batchId: string) {
    return CollisionRepository.findAll({ batchId });
  },
};

export const CollisionService = {
  rejudge(id: string, payload: RejudgePayload): { collision: Collision; history: HistoryRecord } | null {
    const collision = CollisionRepository.findById(id);
    if (!collision) return null;

    const oldStatus = collision.status;
    const now = new Date().toISOString();

    CollisionRepository.updateRejudge(id, payload.newStatus, payload.operator, payload.reason, now);

    const history: HistoryRecord = {
      id: 'hist-' + uid(),
      collisionId: id,
      batchId: collision.batchId,
      operator: payload.operator,
      oldStatus,
      newStatus: payload.newStatus,
      reason: payload.reason,
      createdAt: now,
    };
    HistoryRepository.create(history);

    BatchRepository.updateAnomalyCount(collision.batchId);
    const batch = BatchRepository.findById(collision.batchId);
    if (batch) {
      const remaining = CollisionRepository.findAll({
        batchId: collision.batchId,
        status: ['needs_review', 'confirmed'],
      });
      if (remaining.length === 0) {
        BatchRepository.updateStatus(collision.batchId, 'completed');
      } else {
        BatchRepository.updateStatus(collision.batchId, 'rejudged');
      }
    }

    const updated = CollisionRepository.findById(id)!;
    return { collision: updated, history };
  },

  listAnomalies(opts?: {
    types?: AnomalyType[];
    status?: CollisionStatus[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Collision[] {
    return CollisionRepository.findAll(opts);
  },
};

export const HistoryService = {
  list(batchId?: string): HistoryRecord[] {
    return HistoryRepository.findAll(batchId);
  },
};

export const SavedViewService = {
  list(): SavedView[] {
    return SavedViewRepository.findAll();
  },

  get(id: string): SavedView | null {
    return SavedViewRepository.findById(id);
  },

  create(view: Omit<SavedView, 'id' | 'createdAt'>): SavedView {
    const newView: SavedView = {
      ...view,
      id: 'view-' + uid(),
      createdAt: new Date().toISOString(),
    };
    SavedViewRepository.create(newView);
    return newView;
  },
};

export const ExportService = {
  anomaliesToCsv(opts?: {
    types?: AnomalyType[];
    status?: CollisionStatus[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): string {
    const collisions = CollisionRepository.findAll(opts);
    const header = [
      '异常ID',
      '批次号',
      '异常类型',
      '涉及对象A',
      '涉及对象B',
      '当前状态',
      '描述',
      '发现时间',
      '改判人',
      '改判理由',
      '改判时间',
    ];
    const typeLabels: Record<AnomalyType, string> = {
      overlap: '对象重叠',
      out_of_bounds: '越界坐标',
      missing_coord: '坐标缺失',
      format_error: '格式异常',
    };
    const statusLabels: Record<CollisionStatus, string> = {
      confirmed: '确认碰撞',
      false_positive: '排除误报',
      needs_review: '待复核',
    };
    const rows = collisions.map((c) => [
      c.id,
      c.batchId,
      typeLabels[c.type] || c.type,
      c.objectA || '',
      c.objectB || '',
      statusLabels[c.status] || c.status,
      c.description,
      c.detectedAt,
      c.rejudgedBy || '',
      c.rejudgedReason || '',
      c.rejudgedAt || '',
    ]);
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    return [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  },
};
