import type { Request, Response } from 'express';
import {
  SamplingRecordRepository,
  RiskAssessmentRepository,
  AssessmentLogRepository
} from '../repositories/index';
import { assessRisk } from '../services/riskEngine';
import { generateReport, reportToCSV } from '../services/reportGenerator';
import type { SamplingRecordInput } from '../../shared/types';

export const RecordsController = {
  getAll: (req: Request, res: Response): void => {
    const riskLevel = req.query.risk_level as string | undefined;
    const records = SamplingRecordRepository.findAll(riskLevel);
    res.json({ data: records });
  },

  getOne: (req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const record = SamplingRecordRepository.findById(id);
    if (!record) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    res.json({ data: record });
  },

  create: (req: Request, res: Response): void => {
    const input = req.body as SamplingRecordInput;
    if (!input.date || !input.area || !input.species) {
      res.status(400).json({ error: '缺少必填字段：date、area、species' });
      return;
    }
    const id = SamplingRecordRepository.create(input);
    const newRecord = SamplingRecordRepository.findById(id);

    if (newRecord) {
      const assessment = assessRisk(newRecord);
      SamplingRecordRepository.update(id, {
        risk_level: assessment.risk_level,
        risk_factors: assessment.risk_factors
      });
      RiskAssessmentRepository.create(
        id,
        assessment.risk_level,
        assessment.risk_factors,
        assessment.affected_conclusions
      );
      AssessmentLogRepository.create(id, 'create', { input });
      const finalRecord = SamplingRecordRepository.findById(id);
      res.status(201).json({ data: finalRecord, assessment });
    } else {
      res.status(500).json({ error: '创建失败' });
    }
  },

  update: (req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const existing = SamplingRecordRepository.findById(id);
    if (!existing) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }

    const updates = req.body as Partial<SamplingRecordInput> & { confirmed?: boolean };

    const updatedFields: Record<string, unknown> = { ...updates };

    if (updates.confirmed !== undefined) {
      updatedFields.confirmed = updates.confirmed;
    }

    SamplingRecordRepository.update(id, updatedFields);

    const afterUpdate = SamplingRecordRepository.findById(id);
    if (afterUpdate) {
      const assessment = assessRisk(afterUpdate);
      SamplingRecordRepository.update(id, {
        risk_level: assessment.risk_level,
        risk_factors: assessment.risk_factors
      });
      RiskAssessmentRepository.create(
        id,
        assessment.risk_level,
        assessment.risk_factors,
        assessment.affected_conclusions
      );
      AssessmentLogRepository.create(id, 'update', {
        old_record: existing,
        updates,
        new_assessment: assessment
      });
      const finalRecord = SamplingRecordRepository.findById(id);
      res.json({
        data: finalRecord,
        assessment,
        message: '数据已更新，风险评估已自动重新计算，报告导出内容将同步更新'
      });
    } else {
      res.status(500).json({ error: '更新失败' });
    }
  },

  remove: (req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const existing = SamplingRecordRepository.findById(id);
    if (!existing) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    SamplingRecordRepository.delete(id);
    res.json({ message: '删除成功' });
  },

  batchImport: (req: Request, res: Response): void => {
    const records = req.body as SamplingRecordInput[];
    if (!Array.isArray(records)) {
      res.status(400).json({ error: '请求体必须是数组' });
      return;
    }

    const results: Array<{ id: number; success: boolean; error?: string }> = [];

    for (const input of records) {
      try {
        if (!input.date || !input.area || !input.species) {
          results.push({ id: 0, success: false, error: '缺少必填字段' });
          continue;
        }
        const id = SamplingRecordRepository.create(input);
        const newRecord = SamplingRecordRepository.findById(id);
        if (newRecord) {
          const assessment = assessRisk(newRecord);
          SamplingRecordRepository.update(id, {
            risk_level: assessment.risk_level,
            risk_factors: assessment.risk_factors
          });
          RiskAssessmentRepository.create(
            id,
            assessment.risk_level,
            assessment.risk_factors,
            assessment.affected_conclusions
          );
        }
        results.push({ id, success: true });
      } catch (e) {
        results.push({ id: 0, success: false, error: (e as Error).message });
      }
    }

    res.status(201).json({
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  },

  assess: (req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const record = SamplingRecordRepository.findById(id);
    if (!record) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    const assessment = assessRisk(record);
    SamplingRecordRepository.update(id, {
      risk_level: assessment.risk_level,
      risk_factors: assessment.risk_factors
    });
    RiskAssessmentRepository.create(
      id,
      assessment.risk_level,
      assessment.risk_factors,
      assessment.affected_conclusions
    );
    AssessmentLogRepository.create(id, 'manual_assess', { assessment });
    res.json({ data: assessment });
  },

  getAssessmentHistory: (req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const history = RiskAssessmentRepository.findByRecordId(id);
    res.json({ data: history });
  },

  getLog: (req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const log = AssessmentLogRepository.findByRecordId(id);
    res.json({ data: log });
  }
};

export const AnomaliesController = {
  getAll: (_req: Request, res: Response): void => {
    const pendingRecords = SamplingRecordRepository.findAll('pending');
    const anomalyRecords = SamplingRecordRepository.findAll('anomaly');
    const normalRecords = SamplingRecordRepository.findAll('normal');
    const summary = SamplingRecordRepository.countByRisk();

    res.json({
      data: {
        summary,
        normal: normalRecords,
        pending: pendingRecords,
        anomaly: anomalyRecords
      }
    });
  },

  getImpactChain: (req: Request, res: Response): void => {
    const id = Number(req.params.id);
    const record = SamplingRecordRepository.findById(id);
    if (!record) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    const assessment = assessRisk(record);
    res.json({
      data: {
        record_id: id,
        risk_level: assessment.risk_level,
        risk_factors: assessment.risk_factors,
        affected_conclusions: assessment.affected_conclusions,
        note: '以下结论受缺失/异常数据影响，请勿直接使用。数据补录后结论将自动更新。'
      }
    });
  }
};

export const ExportController = {
  export: (req: Request, res: Response): void => {
    const format = (req.query.format as string) || 'json';
    const records = SamplingRecordRepository.findAll();
    const report = generateReport(records);

    if (format === 'csv') {
      const csv = reportToCSV(report);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="tidal_sampling_report_${Date.now()}.csv"`);
      res.send('\uFEFF' + csv);
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="tidal_sampling_report_${Date.now()}.json"`);
      res.json(report);
    }
  },

  preview: (_req: Request, res: Response): void => {
    const records = SamplingRecordRepository.findAll();
    const report = generateReport(records);
    res.json({ data: report });
  }
};
