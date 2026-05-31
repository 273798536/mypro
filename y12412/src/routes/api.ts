import { Router, Request, Response } from 'express';
import {
  createEstimation,
  reviewEstimation,
  advanceStatus,
  getEstimation,
  listEstimations,
  getRedemptionFreezes,
  getFeeDeductionsByShare,
  addValuationVersion,
} from '../services/sidepocket';
import { generateExportReport, exportReportAsText } from '../services/report';

const router = Router();

router.post('/estimations', (req: Request, res: Response) => {
  try {
    const record = createEstimation(req.body);
    res.status(201).json({ ok: true, data: record });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/estimations', (req: Request, res: Response) => {
  const fundId = req.query.fundId as string | undefined;
  const records = listEstimations(fundId);
  res.json({ ok: true, data: records });
});

router.get('/estimations/:id', (req: Request, res: Response) => {
  try {
    const record = getEstimation(req.params.id);
    res.json({ ok: true, data: record });
  } catch (e: any) {
    res.status(404).json({ ok: false, error: e.message });
  }
});

router.post('/estimations/:id/review', (req: Request, res: Response) => {
  try {
    const record = reviewEstimation(req.params.id, req.body);
    res.json({ ok: true, data: record });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/estimations/:id/advance', (req: Request, res: Response) => {
  try {
    const record = advanceStatus(req.params.id, req.body);
    res.json({ ok: true, data: record });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/estimations/:id/freezes', (req: Request, res: Response) => {
  try {
    const freezes = getRedemptionFreezes(req.params.id);
    res.json({ ok: true, data: freezes });
  } catch (e: any) {
    res.status(404).json({ ok: false, error: e.message });
  }
});

router.get('/estimations/:id/export', (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'json';
    if (format === 'text') {
      const text = exportReportAsText(req.params.id);
      res.type('text/plain').send(text);
    } else {
      const report = generateExportReport(req.params.id);
      res.json({ ok: true, data: report });
    }
  } catch (e: any) {
    res.status(404).json({ ok: false, error: e.message });
  }
});

router.get('/investor-shares/:shareId/fee-deductions', (req: Request, res: Response) => {
  const deductions = getFeeDeductionsByShare(req.params.shareId);
  res.json({ ok: true, data: deductions });
});

router.post('/side-pockets/:sidePocketId/valuation-versions', (req: Request, res: Response) => {
  try {
    const { nav, valuationDate, valuationDelayDays, delayReason } = req.body;
    const version = addValuationVersion(
      req.params.sidePocketId,
      nav,
      valuationDate,
      valuationDelayDays,
      delayReason
    );
    res.status(201).json({ ok: true, data: version });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

export default router;
