import { TaskRepository } from '../repositories/task.js';
import { UnitConversionService } from './unitConversion.js';
import type { TaskDetail } from '../../shared/types.js';

export const ReportService = {
  buildTaskDetail(taskId: string): TaskDetail | null {
    const task = TaskRepository.get(taskId);
    if (!task) return null;
    return {
      ...task,
      params: TaskRepository.getParams(taskId),
      materials: TaskRepository.getMaterials(taskId),
    };
  },

  buildReviewReport(taskId: string) {
    const detail = this.buildTaskDetail(taskId);
    if (!detail) return null;

    const history = TaskRepository.getHistory(taskId);

    const crackSummary = detail.params.map((p) => {
      const lengthMm = UnitConversionService.toMm(p.lengthValue, p.lengthUnit);
      const widthMm = UnitConversionService.toMm(p.widthValue, p.widthUnit);
      const depthMm = UnitConversionService.toMm(p.depthValue, p.depthUnit);
      return {
        crackId: p.crackId,
        size: `${lengthMm.toFixed(0)}×${widthMm.toFixed(1)}×${depthMm.toFixed(0)}mm`,
        collision: p.collisionDetected ? '是' : '否',
        overlapMaterial: p.overlapMaterialId || '-',
        conclusion: p.conclusion,
      };
    });

    const materialIssues = detail.materials.filter(
      (m) => m.calibrationStatus !== 'calibrated',
    );

    return {
      generatedAt: new Date().toISOString(),
      task: {
        taskNo: detail.taskNo,
        bridgeName: detail.bridgeName,
        bridgeCode: detail.bridgeCode,
        submitter: detail.submitter,
        submittedAt: detail.submittedAt,
        status: detail.status,
      },
      crackSummary,
      materialIssues: materialIssues.map((m) => ({
        name: m.name,
        type: m.type,
        status: m.calibrationStatus,
        submittedBy: m.submittedBy,
      })),
      changeHistory: history.map((h) => ({
        field: h.fieldName,
        oldValue: h.oldValue,
        newValue: h.newValue,
        operator: h.operator,
        operatedAt: h.operatedAt,
        reason: h.reason,
        collisionChanged: h.collisionChanged ? '是' : '否',
      })),
      totalChanges: history.length,
      totalMaterials: detail.materials.length,
      problemMaterials: materialIssues.length,
    };
  },
};
