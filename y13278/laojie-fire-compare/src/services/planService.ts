import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import type {
  FirePlan,
  SceneAnnotation,
  ResidentFeedback,
  SitePhoto,
  ChangeRecord,
  VersionSnapshot,
  UnifiedPlanView,
  UpdateContext,
  ChangeType,
  ConflictInfo,
  ConflictSeverity,
} from '../types';
import { createSnapshot, rollbackToSnapshot } from './versionEngine';
import { detectConflicts } from './conflictDetector';

export class PlanService {
  static async listPlans(): Promise<FirePlan[]> {
    const db = await getDB();
    const plans = await db.getAllFromIndex('plans', 'by-updatedAt');
    return plans.reverse();
  }

  static async getPlanView(planId: string): Promise<UnifiedPlanView | null> {
    const db = await getDB();
    const plan = await db.get('plans', planId);
    if (!plan) return null;

    const [annotations, feedbacks, photos, changes, snapshots] = await Promise.all([
      db.getAllFromIndex('annotations', 'by-planId', planId),
      db.getAllFromIndex('feedbacks', 'by-planId', planId),
      db.getAllFromIndex('photos', 'by-planId', planId),
      db.getAllFromIndex('changes', 'by-planId', planId),
      db.getAllFromIndex('snapshots', 'by-planId-version', IDBKeyRange.bound([planId, 0], [planId, Infinity])),
    ]);

    return {
      plan,
      annotations,
      feedbacks,
      photos,
      changes: changes.sort((a, b) => b.timestamp - a.timestamp),
      snapshots: snapshots.sort((a, b) => b.version - a.version),
    };
  }

  static async createPlan(
    name: string,
    location: { lat: number; lng: number; address: string },
    ctx: UpdateContext,
  ): Promise<UnifiedPlanView> {
    const db = await getDB();
    const now = Date.now();
    const planId = uuidv4();

    const plan: FirePlan = {
      id: planId,
      name,
      location,
      status: 'draft',
      sceneSummary: '',
      sideNote: '',
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.operator,
      version: 1,
      conflicts: [],
    };

    const change: ChangeRecord = {
      id: uuidv4(),
      planId,
      type: 'create',
      operator: ctx.operator,
      description: `创建方案：${name}`,
      timestamp: now,
    };

    const tx = db.transaction(['plans', 'changes', 'snapshots'], 'readwrite');
    await tx.objectStore('plans').add(plan);
    await tx.objectStore('changes').add(change);

    const snapshot = createSnapshot(plan, [], [], [], ctx.operator, '方案创建');
    await tx.objectStore('snapshots').add(snapshot);

    await tx.done;

    return {
      plan,
      annotations: [],
      feedbacks: [],
      photos: [],
      changes: [change],
      snapshots: [snapshot],
    };
  }

  static async updatePlanDescription(
    planId: string,
    field: 'sceneSummary' | 'sideNote' | 'name',
    value: string,
    ctx: UpdateContext,
  ): Promise<UnifiedPlanView> {
    return this.executeMutation(planId, ctx, async (_db, plan) => {
      const oldValue = plan[field];
      if (oldValue === value) return null;

      plan[field] = value;
      plan.updatedAt = Date.now();

      const conflicts = detectConflicts(plan, field, oldValue, value);
      if (conflicts.length > 0) {
        plan.status = 'suspended';
        plan.conflicts = [...plan.conflicts, ...conflicts];
      }

      return {
        planChanges: plan,
        changeType: 'update_description',
        changeField: field,
        oldValue,
        newValue: value,
        changeDesc: conflicts.length > 0
          ? `更新${fieldLabel(field)}，检测到${conflicts.length}处冲突，方案已挂起待复核`
          : `更新${fieldLabel(field)}`,
      };
    });
  }

  static async addAnnotation(
    planId: string,
    annotation: Omit<SceneAnnotation, 'id' | 'planId' | 'createdAt' | 'updatedAt'>,
    ctx: UpdateContext,
  ): Promise<UnifiedPlanView> {
    return this.executeMutation(planId, ctx, async (_db, plan, view) => {
      const newAnn: SceneAnnotation = {
        ...annotation,
        id: uuidv4(),
        planId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      plan.updatedAt = Date.now();

      const existingSameLoc = view.annotations.find(
        a =>
          Math.abs(a.location.lat - annotation.location.lat) < 0.0001 &&
          Math.abs(a.location.lng - annotation.location.lng) < 0.0001,
      );

      let conflicts: ConflictInfo[] = [];
      if (existingSameLoc && existingSameLoc.category !== annotation.category) {
        conflicts = [
          {
            id: uuidv4(),
            planId,
            severity: 'warning' as ConflictSeverity,
            title: '同一地点标注类别不一致',
            detail: `地点 ${annotation.location.address} 已有"${existingSameLoc.category}"标注，本次新增"${annotation.category}"，请确认是否为同一地点的不同描述。`,
            affectedFields: ['annotations.category'],
            detectedAt: Date.now(),
            resolved: false,
          },
        ];
        plan.status = 'suspended';
        plan.conflicts = [...plan.conflicts, ...conflicts];
      }

      return {
        planChanges: plan,
        extraStores: [{ store: 'annotations' as const, action: 'add' as const, value: newAnn }],
        changeType: 'update_annotation',
        changeField: 'annotations',
        oldValue: null,
        newValue: newAnn,
        changeDesc: conflicts.length > 0
          ? `新增场景标注 ${annotation.category}，检测到地点命名冲突`
          : `新增场景标注：${annotation.category}`,
      };
    });
  }

  static async addFeedback(
    planId: string,
    feedback: Omit<ResidentFeedback, 'id' | 'planId' | 'createdAt' | 'round'>,
    ctx: UpdateContext,
  ): Promise<UnifiedPlanView> {
    return this.executeMutation(planId, ctx, async (_db, plan, view) => {
      const maxRound = view.feedbacks.reduce((max, f) => Math.max(max, f.round), 0);
      const newFb: ResidentFeedback = {
        ...feedback,
        id: uuidv4(),
        planId,
        round: maxRound + 1,
        createdAt: Date.now(),
      };

      plan.updatedAt = Date.now();

      return {
        planChanges: plan,
        extraStores: [{ store: 'feedbacks' as const, action: 'add' as const, value: newFb }],
        changeType: 'add_feedback',
        changeField: 'feedbacks',
        oldValue: null,
        newValue: newFb,
        changeDesc: `新增第 ${newFb.round} 轮居民反馈（${feedback.author}）`,
      };
    });
  }

  static async addPhoto(
    planId: string,
    photo: Omit<SitePhoto, 'id' | 'planId' | 'uploadedAt'>,
    ctx: UpdateContext,
  ): Promise<UnifiedPlanView> {
    return this.executeMutation(planId, ctx, async (_db, plan) => {
      const newPhoto: SitePhoto = {
        ...photo,
        id: uuidv4(),
        planId,
        uploadedAt: Date.now(),
      };

      plan.updatedAt = Date.now();

      return {
        planChanges: plan,
        extraStores: [{ store: 'photos' as const, action: 'add' as const, value: newPhoto }],
        changeType: 'add_photo',
        changeField: 'photos',
        oldValue: null,
        newValue: newPhoto,
        changeDesc: `补录现场照片：${photo.caption}`,
      };
    });
  }

  static async resolveConflict(
    planId: string,
    conflictId: string,
    resolution: 'accept_new' | 'keep_old' | 'merge_manual',
    ctx: UpdateContext,
    targetSnapshotId?: string,
  ): Promise<UnifiedPlanView> {
    return this.executeMutation(planId, ctx, async (_db, plan, view) => {
      const conflict = plan.conflicts.find(c => c.id === conflictId);
      if (!conflict) return null;

      conflict.resolved = true;
      conflict.resolvedBy = ctx.operator;
      conflict.resolvedAt = Date.now();
      conflict.resolution = resolution;

      let snapshotToRestore: VersionSnapshot | undefined;
      if (resolution === 'keep_old' && targetSnapshotId) {
        snapshotToRestore = view.snapshots.find(s => s.id === targetSnapshotId);
      }

      const unresolved = plan.conflicts.filter(c => !c.resolved);
      plan.status = unresolved.length > 0 ? 'suspended' : 'pending';
      plan.updatedAt = Date.now();

      return {
        planChanges: plan,
        rollbackSnapshot: snapshotToRestore,
        changeType: 'confirm',
        changeField: 'conflicts',
        oldValue: conflict,
        newValue: { ...conflict, resolved: true, resolution },
        changeDesc: `解决冲突「${conflict.title}」：${resolutionLabel(resolution)}`,
      };
    });
  }

  static async confirmPlan(planId: string, ctx: UpdateContext): Promise<UnifiedPlanView> {
    return this.executeMutation(planId, ctx, async (_db, plan) => {
      if (plan.conflicts.some(c => !c.resolved)) {
        throw new Error('存在未解决的冲突，请先处理冲突后再确认方案。');
      }
      plan.status = 'confirmed';
      plan.updatedAt = Date.now();
      return {
        planChanges: plan,
        changeType: 'confirm',
        changeField: 'status',
        oldValue: plan.status,
        newValue: 'confirmed',
        changeDesc: '方案已确认归档',
      };
    });
  }

  private static async executeMutation(
    planId: string,
    ctx: UpdateContext,
    mutator: (
      db: Awaited<ReturnType<typeof getDB>>,
      plan: FirePlan,
      view: UnifiedPlanView,
    ) => Promise<{
      planChanges: FirePlan;
      extraStores?: Array<{
        store: 'annotations' | 'feedbacks' | 'photos';
        action: 'add' | 'put';
        value: unknown;
      }>;
      rollbackSnapshot?: VersionSnapshot;
      changeType: ChangeType;
      changeField?: string;
      oldValue?: unknown;
      newValue?: unknown;
      changeDesc: string;
    } | null>,
  ): Promise<UnifiedPlanView> {
    const db = await getDB();
    const view = await this.getPlanView(planId);
    if (!view) throw new Error('方案不存在');
    if (view.plan.status === 'confirmed') throw new Error('已确认的方案不可修改');

    const result = await mutator(db, { ...view.plan }, view);
    if (!result) return view;

    let finalPlan = result.planChanges;
    let finalAnnotations = view.annotations;
    let finalFeedbacks = view.feedbacks;
    let finalPhotos = view.photos;

    if (result.rollbackSnapshot) {
      const rolled = rollbackToSnapshot(result.rollbackSnapshot);
      finalPlan = rolled.plan;
      finalAnnotations = rolled.annotations;
      finalFeedbacks = rolled.feedbacks;
      finalPhotos = rolled.photos;
    }

    finalPlan.version = finalPlan.version + 1;

    const tx = db.transaction(
      ['plans', 'annotations', 'feedbacks', 'photos', 'changes', 'snapshots'],
      'readwrite',
    );

    await tx.objectStore('plans').put(finalPlan);

    if (result.extraStores) {
      for (const extra of result.extraStores) {
        const store = tx.objectStore(extra.store);
        if (extra.action === 'add') {
          await store.add(extra.value as never);
          if (extra.store === 'annotations') finalAnnotations = [...finalAnnotations, extra.value as SceneAnnotation];
          if (extra.store === 'feedbacks') finalFeedbacks = [...finalFeedbacks, extra.value as ResidentFeedback];
          if (extra.store === 'photos') finalPhotos = [...finalPhotos, extra.value as SitePhoto];
        } else {
          await store.put(extra.value as never);
        }
      }
    }

    if (result.rollbackSnapshot) {
      await tx.objectStore('annotations').clear();
      await tx.objectStore('feedbacks').clear();
      await tx.objectStore('photos').clear();
      for (const a of finalAnnotations) await tx.objectStore('annotations').add(a);
      for (const f of finalFeedbacks) await tx.objectStore('feedbacks').add(f);
      for (const p of finalPhotos) await tx.objectStore('photos').add(p);
    }

    const change: ChangeRecord = {
      id: uuidv4(),
      planId,
      type: result.changeType,
      field: result.changeField,
      oldValue: result.oldValue,
      newValue: result.newValue,
      operator: ctx.operator,
      description: result.changeDesc,
      timestamp: Date.now(),
    };

    const snapshot = createSnapshot(
      finalPlan,
      finalAnnotations,
      finalFeedbacks,
      finalPhotos,
      ctx.operator,
      ctx.message || result.changeDesc,
    );
    change.snapshotId = snapshot.id;

    await tx.objectStore('changes').add(change);
    await tx.objectStore('snapshots').add(snapshot);
    await tx.done;

    const finalChanges = [change, ...view.changes];
    const finalSnapshots = [snapshot, ...view.snapshots];

    return {
      plan: finalPlan,
      annotations: finalAnnotations,
      feedbacks: finalFeedbacks,
      photos: finalPhotos,
      changes: finalChanges,
      snapshots: finalSnapshots,
    };
  }
}

function fieldLabel(field: 'sceneSummary' | 'sideNote' | 'name'): string {
  const map: Record<string, string> = {
    sceneSummary: '场景摘要',
    sideNote: '侧边说明',
    name: '方案名称',
  };
  return map[field] || field;
}

function resolutionLabel(r: 'accept_new' | 'keep_old' | 'merge_manual'): string {
  const map: Record<string, string> = {
    accept_new: '采用新内容',
    keep_old: '保留原判断',
    merge_manual: '人工合并',
  };
  return map[r] || r;
}
