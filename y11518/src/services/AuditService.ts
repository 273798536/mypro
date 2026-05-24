import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import {
  AuditSnapshot,
  SnapshotType,
  TargetType,
} from "../entities/AuditSnapshot";
import * as diff from "diff";

export class AuditService {
  private snapshotRepo: Repository<AuditSnapshot>;

  constructor() {
    this.snapshotRepo = AppDataSource.getRepository(AuditSnapshot);
  }

  async createSnapshot(
    snapshotType: SnapshotType,
    targetType: TargetType,
    targetId: string | null,
    data: Record<string, any>,
    previousData?: Record<string, any>,
    options?: {
      operationId?: string;
      operationName?: string;
      operator?: string;
      remark?: string;
    }
  ): Promise<AuditSnapshot> {
    const snapshot = new AuditSnapshot();
    snapshot.snapshotType = snapshotType;
    snapshot.targetType = targetType;
    snapshot.targetId = targetId as any;
    snapshot.data = this.sanitizeData(data);
    snapshot.previousData = previousData ? this.sanitizeData(previousData) : (undefined as any);
    snapshot.operationId = options?.operationId as any;
    snapshot.operationName = options?.operationName as any;
    snapshot.operator = options?.operator as any;
    snapshot.remark = options?.remark as any;

    if (previousData) {
      snapshot.diff = this.calculateDiff(previousData, data) as any;
    }

    return await this.snapshotRepo.save(snapshot);
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (typeof value === "bigint") {
        result[key] = value.toString();
      } else if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  private calculateDiff(
    oldData: Record<string, any>,
    newData: Record<string, any>
  ): Array<{
    field: string;
    op: "add" | "remove" | "replace";
    oldValue?: any;
    newValue?: any;
    path: string;
  }> {
    const differences: Array<{
      field: string;
      op: "add" | "remove" | "replace";
      oldValue?: any;
      newValue?: any;
      path: string;
    }> = [];

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldVal = oldData[key];
      const newVal = newData[key];

      if (oldVal === undefined && newVal !== undefined) {
        differences.push({
          field: key,
          op: "add",
          newValue: newVal,
          path: `/${key}`,
        });
      } else if (newVal === undefined && oldVal !== undefined) {
        differences.push({
          field: key,
          op: "remove",
          oldValue: oldVal,
          path: `/${key}`,
        });
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        differences.push({
          field: key,
          op: "replace",
          oldValue: oldVal,
          newValue: newVal,
          path: `/${key}`,
        });
      }
    }

    return differences;
  }

  async getSnapshotsByTarget(
    targetType: TargetType,
    targetId: string
  ): Promise<AuditSnapshot[]> {
    return await this.snapshotRepo.find({
      where: { targetType, targetId },
      order: { createdAt: "DESC" },
    });
  }

  async getSnapshotsByOperation(operationId: string): Promise<AuditSnapshot[]> {
    return await this.snapshotRepo.find({
      where: { operationId },
      order: { createdAt: "ASC" },
    });
  }

  async getSnapshotHistory(
    targetType: TargetType,
    targetId: string,
    limit: number = 50
  ): Promise<{
    snapshots: AuditSnapshot[];
    changeSummary: Array<{
      field: string;
      changeCount: number;
      lastChangedAt: Date;
    }>;
  }> {
    const snapshots = await this.snapshotRepo.find({
      where: { targetType, targetId },
      order: { createdAt: "DESC" },
      take: limit,
    });

    const changeMap = new Map<
      string,
      { changeCount: number; lastChangedAt: Date }
    >();

    for (const snapshot of snapshots) {
      if (snapshot.diff) {
        for (const d of snapshot.diff) {
          const existing = changeMap.get(d.field);
          if (existing) {
            existing.changeCount++;
          } else {
            changeMap.set(d.field, {
              changeCount: 1,
              lastChangedAt: snapshot.createdAt,
            });
          }
        }
      }
    }

    const changeSummary = Array.from(changeMap.entries()).map(([field, val]) => ({
      field,
      changeCount: val.changeCount,
      lastChangedAt: val.lastChangedAt,
    }));

    return { snapshots, changeSummary };
  }

  compareObjects(obj1: any, obj2: any): {
    isEqual: boolean;
    differences: string[];
    detailedDiff: any[];
  } {
    const differences: string[] = [];
    const detailedDiff: any[] = [];

    const compare = (a: any, b: any, path: string = "") => {
      if (a === null && b === null) return;
      if (a === undefined && b === undefined) return;

      if (a === null || b === null || a === undefined || b === undefined) {
        differences.push(`${path}: ${a} -> ${b}`);
        detailedDiff.push({ path, oldValue: a, newValue: b });
        return;
      }

      if (typeof a !== typeof b) {
        differences.push(`${path}: type mismatch ${typeof a} vs ${typeof b}`);
        detailedDiff.push({ path, oldValue: a, newValue: b, type: "type_mismatch" });
        return;
      }

      if (typeof a === "object") {
        if (Array.isArray(a) && Array.isArray(b)) {
          if (a.length !== b.length) {
            differences.push(`${path}: array length ${a.length} vs ${b.length}`);
            detailedDiff.push({ path, oldLength: a.length, newLength: b.length, type: "array_length" });
          }
          for (let i = 0; i < Math.max(a.length, b.length); i++) {
            compare(a[i], b[i], `${path}[${i}]`);
          }
        } else {
          const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
          for (const key of keys) {
            compare(a[key], b[key], path ? `${path}.${key}` : key);
          }
        }
      } else if (a !== b) {
        differences.push(`${path}: ${a} -> ${b}`);
        detailedDiff.push({ path, oldValue: a, newValue: b });
      }
    };

    compare(obj1, obj2);

    return {
      isEqual: differences.length === 0,
      differences,
      detailedDiff,
    };
  }
}
