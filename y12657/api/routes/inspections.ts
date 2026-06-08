import express, { type Request, type Response } from 'express';
import { InspectionRepository } from '../db/repositories/InspectionRepository.js';
import { SectionParamsRepository } from '../db/repositories/SectionParamsRepository.js';
import { MeasurePointRepository } from '../db/repositories/MeasurePointRepository.js';
import { ChangeHistoryRepository } from '../db/repositories/ChangeHistoryRepository.js';
import { ClearanceCalculator } from '../services/ClearanceCalculator.js';
import { HistoryService } from '../services/HistoryService.js';
import { ReportService } from '../services/ReportService.js';
import { UnitConverter } from '../services/UnitConverter.js';
import { generateId, nowISO } from '../db/database.js';
import type {
  InspectionStatus,
  MeasurePoint,
  SectionParams,
} from '../../shared/types.js';

const router = express.Router();

const DEFAULT_OPERATOR = '舞台统筹';

router.get('/', (req: Request, res: Response) => {
  const keyword = req.query.keyword as string | undefined;
  const status = req.query.status as InspectionStatus | undefined;
  const list = InspectionRepository.list(keyword, status).map((insp) => {
    const points = MeasurePointRepository.listByBatch(insp.id, insp.currentBatchId);
    const abnormalCount = points.filter((p) => p.isAbnormal).length;
    return { ...insp, abnormalCount, totalPoints: points.length };
  });
  res.json({ success: true, data: list });
});

router.get('/:id', (req: Request, res: Response) => {
  const inspection = InspectionRepository.getById(req.params.id);
  if (!inspection) return res.status(404).json({ success: false, error: '检查记录不存在' });
  const params = SectionParamsRepository.getByBatch(inspection.id, inspection.currentBatchId);
  const points = MeasurePointRepository.listByBatch(inspection.id, inspection.currentBatchId);
  res.json({ success: true, data: { inspection, params, points } });
});

router.post('/', (req: Request, res: Response) => {
  const { projectName, garageCode, scope, baseUnit, minClearanceRequired } = req.body;
  if (!projectName || !garageCode) {
    return res.status(400).json({ success: false, error: '项目名和车库编号必填' });
  }
  const inspection = InspectionRepository.create({
    projectName,
    garageCode,
    scope,
    baseUnit,
    minClearanceRequired,
    lastEditor: DEFAULT_OPERATOR,
  });
  SectionParamsRepository.create({
    inspectionId: inspection.id,
    batchId: inspection.currentBatchId,
    beamHeight: 600,
    pipeDiameter: 150,
    ceilingThickness: 50,
    slabThickness: 200,
    floorElevation: 0,
  });
  res.json({ success: true, data: inspection });
});

router.post('/import', (req: Request, res: Response) => {
  const { projectName, garageCode, scope, baseUnit, minClearanceRequired, points: rawPoints } = req.body;
  if (!projectName || !garageCode || !Array.isArray(rawPoints)) {
    return res.status(400).json({ success: false, error: '导入数据格式不正确' });
  }
  const inspection = InspectionRepository.create({
    projectName,
    garageCode,
    scope: scope || '',
    baseUnit: baseUnit || 'mm',
    minClearanceRequired: minClearanceRequired || 2200,
    lastEditor: DEFAULT_OPERATOR,
  });
  const params = SectionParamsRepository.create({
    inspectionId: inspection.id,
    batchId: inspection.currentBatchId,
    beamHeight: 600,
    pipeDiameter: 150,
    ceilingThickness: 50,
    slabThickness: 200,
    floorElevation: 0,
  });
  const points: Omit<MeasurePoint, 'id' | 'createdAt' | 'updatedAt'>[] = rawPoints.map((p: any) => {
    const measuredMM = UnitConverter.toMM(p.measuredValue ?? 0, baseUnit || 'mm');
    const { calculatedClearance, isAbnormal } = ClearanceCalculator.calculateClearance(
      measuredMM,
      params,
      inspection.minClearanceRequired
    );
    return {
      inspectionId: inspection.id,
      batchId: inspection.currentBatchId,
      sectionLineId: p.sectionLineId || 'S1',
      code: p.code || `P${Math.random().toString(36).slice(2, 6)}`,
      coordinate: p.coordinate || { x: 0, y: 0, z: 0 },
      measuredValue: measuredMM,
      calculatedClearance,
      isAbnormal,
      screenshotUrl: p.screenshotUrl || '',
      status: isAbnormal ? 'abnormal' : 'normal',
      remark: p.remark || '',
      handlingOpinion: p.handlingOpinion || '',
    };
  });
  MeasurePointRepository.createBatch(points);
  InspectionRepository.update(inspection.id, { status: 'checking', lastEditor: DEFAULT_OPERATOR });
  res.json({ success: true, data: { id: inspection.id } });
});

router.get('/:id/params', (req: Request, res: Response) => {
  const inspection = InspectionRepository.getById(req.params.id);
  if (!inspection) return res.status(404).json({ success: false, error: '检查记录不存在' });
  const params = SectionParamsRepository.getByBatch(inspection.id, inspection.currentBatchId);
  res.json({ success: true, data: params });
});

router.put('/:id/params', (req: Request, res: Response) => {
  const inspection = InspectionRepository.getById(req.params.id);
  if (!inspection) return res.status(404).json({ success: false, error: '检查记录不存在' });
  const { beamHeight, pipeDiameter, ceilingThickness, slabThickness, floorElevation, reason, operator } = req.body;
  const oldParams = SectionParamsRepository.getByBatch(inspection.id, inspection.currentBatchId);
  const newBatchId = generateId('batch_');
  const newParams: SectionParams = SectionParamsRepository.create({
    inspectionId: inspection.id,
    batchId: newBatchId,
    beamHeight: beamHeight ?? oldParams.beamHeight,
    pipeDiameter: pipeDiameter ?? oldParams.pipeDiameter,
    ceilingThickness: ceilingThickness ?? oldParams.ceilingThickness,
    slabThickness: slabThickness ?? oldParams.slabThickness,
    floorElevation: floorElevation ?? oldParams.floorElevation,
  });
  const oldPoints = MeasurePointRepository.listByBatch(inspection.id, inspection.currentBatchId);
  const newPoints = oldPoints.map((p) => {
    const { calculatedClearance, isAbnormal } = ClearanceCalculator.calculateClearance(
      p.measuredValue,
      newParams,
      inspection.minClearanceRequired
    );
    return {
      inspectionId: p.inspectionId,
      batchId: newBatchId,
      sectionLineId: p.sectionLineId,
      code: p.code,
      coordinate: p.coordinate,
      measuredValue: p.measuredValue,
      calculatedClearance,
      isAbnormal,
      screenshotUrl: p.screenshotUrl,
      status: (isAbnormal ? 'abnormal' : 'normal') as 'normal' | 'abnormal' | 'revised' | 'confirmed',
      remark: p.remark,
      handlingOpinion: p.handlingOpinion,
    };
  });
  MeasurePointRepository.createBatch(newPoints);
  InspectionRepository.update(inspection.id, {
    currentBatchId: newBatchId,
    status: 'reviewing',
    lastEditor: operator || DEFAULT_OPERATOR,
  });
  HistoryService.recordChange({
    inspectionId: inspection.id,
    batchId: newBatchId,
    operator: operator || DEFAULT_OPERATOR,
    action: 'param_update',
    targetType: 'params',
    targetId: newParams.id,
    reason: reason || '剖面参数调整',
    beforeValue: oldParams as unknown as Record<string, unknown>,
    afterValue: newParams as unknown as Record<string, unknown>,
  });
  res.json({ success: true, data: { params: newParams, points: newPoints, batchId: newBatchId } });
});

router.get('/:id/points', (req: Request, res: Response) => {
  const inspection = InspectionRepository.getById(req.params.id);
  if (!inspection) return res.status(404).json({ success: false, error: '检查记录不存在' });
  const points = MeasurePointRepository.listByBatch(inspection.id, inspection.currentBatchId);
  res.json({ success: true, data: points });
});

router.put('/:id/points/:pointId', (req: Request, res: Response) => {
  const inspection = InspectionRepository.getById(req.params.id);
  if (!inspection) return res.status(404).json({ success: false, error: '检查记录不存在' });
  const oldPoint = MeasurePointRepository.getById(req.params.pointId);
  if (!oldPoint) return res.status(404).json({ success: false, error: '测量点不存在' });
  const { measuredValue, status, remark, handlingOpinion, isAbnormal, reason, operator } = req.body;
  const params = SectionParamsRepository.getByBatch(inspection.id, inspection.currentBatchId);
  const measuredMM = measuredValue !== undefined ? UnitConverter.toMM(measuredValue, inspection.baseUnit) : oldPoint.measuredValue;
  const { calculatedClearance, isAbnormal: newIsAbnormal } = ClearanceCalculator.calculateClearance(
    measuredMM,
    params,
    inspection.minClearanceRequired
  );
  const updateData: Partial<MeasurePoint> = {};
  if (measuredValue !== undefined) updateData.measuredValue = measuredMM;
  if (measuredValue !== undefined) updateData.calculatedClearance = calculatedClearance;
  if (measuredValue !== undefined) updateData.isAbnormal = isAbnormal ?? newIsAbnormal;
  if (status !== undefined) updateData.status = status;
  if (remark !== undefined) updateData.remark = remark;
  if (handlingOpinion !== undefined) updateData.handlingOpinion = handlingOpinion;
  updateData.updatedAt = nowISO();
  MeasurePointRepository.update(req.params.pointId, updateData);
  const afterPoint = MeasurePointRepository.getById(req.params.pointId)!;
  HistoryService.recordChange({
    inspectionId: inspection.id,
    batchId: inspection.currentBatchId,
    operator: operator || DEFAULT_OPERATOR,
    action: 'point_revise',
    targetType: 'measure_point',
    targetId: req.params.pointId,
    reason: reason || '测量点修正',
    beforeValue: oldPoint as unknown as Record<string, unknown>,
    afterValue: afterPoint as unknown as Record<string, unknown>,
  });
  InspectionRepository.update(inspection.id, { status: 'reviewing', lastEditor: operator || DEFAULT_OPERATOR });
  res.json({ success: true, data: afterPoint });
});

router.get('/:id/history', (req: Request, res: Response) => {
  const inspection = InspectionRepository.getById(req.params.id);
  if (!inspection) return res.status(404).json({ success: false, error: '检查记录不存在' });
  const history = ChangeHistoryRepository.listByInspection(inspection.id);
  res.json({ success: true, data: history });
});

router.get('/:id/compare', (req: Request, res: Response) => {
  const inspection = InspectionRepository.getById(req.params.id);
  if (!inspection) return res.status(404).json({ success: false, error: '检查记录不存在' });
  const afterBatchId = (req.query.afterBatch as string) || inspection.currentBatchId;
  const histories = ChangeHistoryRepository.listByInspection(inspection.id);
  let beforeBatchId = req.query.beforeBatch as string;
  if (!beforeBatchId) {
    const paramUpdates = histories.filter((h) => h.action === 'param_update');
    if (paramUpdates.length >= 2) {
      beforeBatchId = paramUpdates[1].batchId;
    } else if (paramUpdates.length === 1) {
      const latestUpdate = paramUpdates[0];
      const beforeParams = (latestUpdate.beforeValue as Record<string, unknown>) || {};
      beforeBatchId = (beforeParams.batchId as string) || afterBatchId;
    } else {
      beforeBatchId = afterBatchId;
    }
  }
  const beforeParams = SectionParamsRepository.getByBatch(inspection.id, beforeBatchId);
  const afterParams = SectionParamsRepository.getByBatch(inspection.id, afterBatchId);
  const beforePoints = MeasurePointRepository.listByBatch(inspection.id, beforeBatchId);
  const afterPoints = MeasurePointRepository.listByBatch(inspection.id, afterBatchId);
  const pointDiffs: Array<{ pointId: string; code: string; field: string; before: unknown; after: unknown }> = [];
  const afterMap = new Map(afterPoints.map((p) => [p.code, p]));
  for (const bp of beforePoints) {
    const ap = afterMap.get(bp.code);
    if (!ap) continue;
    const fields: Array<keyof MeasurePoint> = ['measuredValue', 'calculatedClearance', 'isAbnormal', 'status', 'handlingOpinion'];
    for (const f of fields) {
      if (JSON.stringify(bp[f]) !== JSON.stringify(ap[f])) {
        pointDiffs.push({ pointId: ap.id, code: ap.code, field: f, before: bp[f], after: ap[f] });
      }
    }
  }
  res.json({
    success: true,
    data: {
      beforeBatchId,
      afterBatchId,
      before: { params: beforeParams, points: beforePoints, abnormalCount: beforePoints.filter((p) => p.isAbnormal).length },
      after: { params: afterParams, points: afterPoints, abnormalCount: afterPoints.filter((p) => p.isAbnormal).length },
      pointDiffs,
    },
  });
});

router.post('/:id/review', (req: Request, res: Response) => {
  const inspection = InspectionRepository.getById(req.params.id);
  if (!inspection) return res.status(404).json({ success: false, error: '检查记录不存在' });
  const { pass, reason, operator } = req.body;
  const action = pass ? 'review_pass' : 'review_reject';
  const newStatus = pass ? 'completed' : 'checking';
  HistoryService.recordChange({
    inspectionId: inspection.id,
    batchId: inspection.currentBatchId,
    operator: operator || DEFAULT_OPERATOR,
    action,
    targetType: 'conclusion',
    targetId: inspection.id,
    reason: reason || (pass ? '复核通过' : '复核驳回，需重新修正'),
    beforeValue: { status: inspection.status },
    afterValue: { status: newStatus },
  });
  InspectionRepository.update(inspection.id, { status: newStatus, lastEditor: operator || DEFAULT_OPERATOR });
  res.json({ success: true, data: { status: newStatus } });
});

router.get('/:id/export', (req: Request, res: Response) => {
  const inspection = InspectionRepository.getById(req.params.id);
  if (!inspection) return res.status(404).json({ success: false, error: '检查记录不存在' });
  const params = SectionParamsRepository.getByBatch(inspection.id, inspection.currentBatchId);
  const points = MeasurePointRepository.listByBatch(inspection.id, inspection.currentBatchId);
  const format = (req.query.format as string) || 'xlsx';
  const suffix = inspection.currentBatchId.slice(-6);
  if (format === 'pdf') {
    const buffer = ReportService.exportPDF(inspection, params, points);
    const safeName = encodeURIComponent(`${inspection.projectName}_净空检查报告_${suffix}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
    return res.send(buffer);
  }
  const buffer = ReportService.exportExcel(inspection, params, points);
  const safeName = encodeURIComponent(`${inspection.projectName}_净空检查报告_${suffix}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
  res.send(buffer);
});

export default router;
