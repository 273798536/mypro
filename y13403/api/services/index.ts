import { RecordRepository, VersionRepository, StepRepository } from '../repositories';
import { computeForRecord } from '../engine/compute';
import type {
  TopoRecord,
  RecordStatus,
  BoundaryResult,
  RecordVersion,
  ComputationStep,
  HandoverSummary,
  ImportRecordInput,
  UpdateRecordInput,
} from '../../shared/types';

function now(): string {
  return new Date().toISOString();
}

export const RecordService = {
  list(filters?: { status?: RecordStatus; keyword?: string }): TopoRecord[] {
    return RecordRepository.list(filters);
  },

  getById(id: string): TopoRecord | null {
    return RecordRepository.getById(id);
  },

  listVersions(id: string): RecordVersion[] {
    return VersionRepository.listByRecord(id);
  },

  getComputation(id: string): ComputationStep[] {
    return StepRepository.listByRecord(id);
  },

  importBatch(inputs: ImportRecordInput[], operator: string): TopoRecord[] {
    const results: TopoRecord[] = [];
    for (const input of inputs) {
      const computed = computeForRecord({
        recordNo: input.recordNo,
        paramVersion: input.paramVersion,
        remark: input.remark ?? '',
        isLateSubmission: input.isLateSubmission ?? false,
      });

      const initialStatus: RecordStatus = computed.defaultStatus;

      const saved = RecordRepository.insert({
        recordNo: input.recordNo,
        paramVersion: input.paramVersion,
        status: initialStatus,
        boundaryResult: computed.boundaryResult,
        remark: input.remark ?? '',
        isLateSubmission: input.isLateSubmission ?? false,
        noMismatch: computed.noMismatch,
        currentVersion: 1,
        createdAt: now(),
        updatedAt: now(),
      });

      VersionRepository.insert({
        recordId: saved.id,
        version: 1,
        status: saved.status,
        boundaryResult: saved.boundaryResult,
        remark: saved.remark,
        paramVersion: saved.paramVersion,
        operator,
        changedAt: now(),
      });

      StepRepository.insertMany(saved.id, computed.steps);
      results.push(saved);
    }
    return results;
  },

  confirm(id: string, operator: string): TopoRecord | null {
    const rec = RecordRepository.getById(id);
    if (!rec) return null;
    if (rec.status === 'confirmed') return rec;

    const nextVersion = rec.currentVersion + 1;
    RecordRepository.update(id, {
      status: 'confirmed',
      currentVersion: nextVersion,
      updatedAt: now(),
    });
    VersionRepository.insert({
      recordId: id,
      version: nextVersion,
      status: 'confirmed',
      boundaryResult: rec.boundaryResult,
      remark: rec.remark,
      paramVersion: rec.paramVersion,
      operator,
      changedAt: now(),
    });
    return RecordRepository.getById(id);
  },

  revoke(id: string, operator: string): TopoRecord | null {
    const rec = RecordRepository.getById(id);
    if (!rec) return null;

    const versions = VersionRepository.listByRecord(id);
    if (versions.length <= 1) {
      if (rec.status === 'pending') return rec;
      const nextVersion = rec.currentVersion + 1;
      RecordRepository.update(id, {
        status: 'pending',
        currentVersion: nextVersion,
        updatedAt: now(),
      });
      VersionRepository.insert({
        recordId: id,
        version: nextVersion,
        status: 'pending',
        boundaryResult: rec.boundaryResult,
        remark: rec.remark,
        paramVersion: rec.paramVersion,
        operator,
        changedAt: now(),
      });
      return RecordRepository.getById(id);
    }

    const prev = versions[versions.length - 2];
    const nextVersion = rec.currentVersion + 1;
    RecordRepository.update(id, {
      status: prev.status,
      boundaryResult: prev.boundaryResult,
      remark: prev.remark,
      currentVersion: nextVersion,
      updatedAt: now(),
    });
    VersionRepository.insert({
      recordId: id,
      version: nextVersion,
      status: prev.status,
      boundaryResult: prev.boundaryResult,
      remark: prev.remark,
      paramVersion: prev.paramVersion,
      operator,
      changedAt: now(),
    });
    return RecordRepository.getById(id);
  },

  update(id: string, input: UpdateRecordInput): TopoRecord | null {
    const rec = RecordRepository.getById(id);
    if (!rec) return null;

    const nextVersion = rec.currentVersion + 1;
    const newStatus = input.status ?? rec.status;
    const newResult = input.boundaryResult ?? rec.boundaryResult;
    const newRemark = input.remark ?? rec.remark;

    RecordRepository.update(id, {
      status: newStatus,
      boundaryResult: newResult,
      remark: newRemark,
      currentVersion: nextVersion,
      updatedAt: now(),
    });
    VersionRepository.insert({
      recordId: id,
      version: nextVersion,
      status: newStatus,
      boundaryResult: newResult,
      remark: newRemark,
      paramVersion: rec.paramVersion,
      operator: input.operator,
      changedAt: now(),
    });

    if (input.status === 'manual_overruled' || input.boundaryResult) {
      const existing = StepRepository.listByRecord(id);
      const overrideStep: ComputationStep = {
        stepId: (existing.length || 0) + 1,
        title: '人工改判覆盖',
        description: `复核员 ${input.operator} 手动修改状态/结论`,
        input: {
          operator: input.operator,
          previous: { status: rec.status, result: rec.boundaryResult },
        },
        output: {
          overridden: true,
          now: { status: newStatus, result: newResult },
          remark: newRemark,
        },
        passed: true,
        contributesToConclusion: true,
        timestamp: now(),
      };
      StepRepository.insertMany(id, [overrideStep]);
    }

    return RecordRepository.getById(id);
  },

  summary(): HandoverSummary {
    const all = RecordRepository.list();
    const confirmed = all.filter((r) => r.status === 'confirmed');
    const needEvidence = all.filter((r) => r.status === 'need_evidence' || r.status === 'pending');
    const manualOverruled = all.filter((r) => r.status === 'manual_overruled');

    return {
      confirmed: { count: confirmed.length, items: confirmed },
      needEvidence: { count: needEvidence.length, items: needEvidence },
      manualOverruled: { count: manualOverruled.length, items: manualOverruled },
    };
  },
};
