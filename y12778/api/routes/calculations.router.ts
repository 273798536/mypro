import { Router } from 'express';
import { dataStore } from '../repositories/store';
import { calculateConcentration } from '../services/calculation.service';
import { buildCalculationTrace } from '../services/trace.service';
import { logAudit } from '../services/audit.service';
import { buildExportData } from '../services/export.service';
import type { Calculation } from '../../shared/types';

const router = Router();

router.get('/', (req, res) => {
  const status = req.query.status as string | undefined;
  let calcs = dataStore.getCalculations();
  if (status) {
    calcs = calcs.filter((c) => c.status === status);
  }
  res.json(calcs);
});

router.get('/stats', (req, res) => {
  const calcs = dataStore.getCalculations();
  res.json({
    total: calcs.length,
    pending: calcs.filter((c) => c.status === 'pending').length,
    passed: calcs.filter((c) => c.status === 'passed').length,
    rejected: calcs.filter((c) => c.status === 'rejected').length,
    error: calcs.filter((c) => c.status === 'error').length,
  });
});

router.get('/:id', (req, res) => {
  const calc = dataStore.getCalculationById(req.params.id);
  if (!calc) {
    res.status(404).json({ message: '试算记录不存在' });
    return;
  }
  const trace = buildCalculationTrace(calc.id);
  res.json({ ...calc, traceIds: trace });
});

router.get('/:id/trace', (req, res) => {
  const trace = buildCalculationTrace(req.params.id);
  res.json(trace);
});

router.post('/', (req, res) => {
  const { reagentId, observedTension, temperature } = req.body;
  const reagent = dataStore.getReagentById(reagentId);
  if (!reagent) {
    res.status(400).json({
      error: {
        code: 'REAGENT_NOT_FOUND',
        title: '试剂不存在',
        actionableSteps: ['请检查试剂ID是否正确', '在试剂台账中确认该批次存在'],
      },
    });
    return;
  }

  const result = calculateConcentration({
    reagent,
    observedTension: Number(observedTension),
    temperature: Number(temperature),
  });

  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  const saved = dataStore.addCalculation(result.calculation!);

  logAudit({
    entityType: 'calculation',
    entityId: saved.id,
    action: 'create',
    operator: saved.createdBy,
    details: `${reagent.batchNo}在${temperature}℃下试算（张力${observedTension}mN/m），浓度${saved.calculatedConcentration.toFixed(1)}mg/L`,
  });

  res.json(saved);
});

router.put('/:id/review', (req, res) => {
  const { status, reviewNote, operator } = req.body;
  const calc = dataStore.getCalculationById(req.params.id);
  if (!calc) {
    res.status(404).json({ message: '试算记录不存在' });
    return;
  }

  if (!['passed', 'rejected'].includes(status)) {
    res.status(400).json({ message: '无效的复核状态' });
    return;
  }

  const updated: Partial<Calculation> = {
    status: status as Calculation['status'],
    reviewNote,
    reviewedBy: operator ?? '质检工程师',
    reviewedAt: new Date().toISOString(),
  };

  const result = dataStore.updateCalculation(req.params.id, updated);

  logAudit({
    entityType: 'calculation',
    entityId: req.params.id,
    action: 'review',
    operator: updated.reviewedBy!,
    details: `复核${status === 'passed' ? '通过' : '驳回'}：${reviewNote ?? '无备注'}`,
  });

  res.json(result);
});

router.get('/:id/export', (req, res) => {
  const calc = dataStore.getCalculationById(req.params.id);
  if (!calc) {
    res.status(404).json({ message: '试算记录不存在' });
    return;
  }

  const data = buildExportData(req.params.id);

  logAudit({
    entityType: 'calculation',
    entityId: req.params.id,
    action: 'export',
    operator: '质检工程师',
    details: `导出试算报告：${calc.reagentBatchNo}`,
  });

  const csvLines: string[] = [];
  csvLines.push('=== 表面张力浓度试算报告 ===');
  csvLines.push(`校验码：${data.summaryChecksum}`);
  csvLines.push('');
  csvLines.push('--- 摘要（与页面展示一致） ---');
  data.summary.forEach((row) => {
    csvLines.push(`${row.field},${row.value.replace(/,/g, '，')}`);
  });
  csvLines.push('');
  csvLines.push('--- 追溯链路 ---');
  data.trace.forEach((row) => {
    csvLines.push(`${row.field},${row.value.replace(/,/g, '，')}`);
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  const encodedFileName = encodeURIComponent(data.fileName);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`
  );
  res.send('\ufeff' + csvLines.join('\n'));
});

export default router;
