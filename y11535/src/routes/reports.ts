import { Router } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { reportService } from '../services/ReportService';

const router = Router();

router.use(authenticate);

router.get(
  '/hrbp',
  requirePermission('report:export'),
  async (req: AuthRequest, res) => {
    try {
      const { trainingId, department, startDate, endDate, includeFrozen } = req.query;

      const report = await reportService.generateHRBPReport({
        trainingId: trainingId as string,
        department: department as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        includeFrozen: includeFrozen !== 'false',
        generatedBy: req.user!.id,
        generatorName: req.user!.name,
        generatorRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/hrbp/export',
  requirePermission('report:export'),
  async (req: AuthRequest, res) => {
    try {
      const { trainingId, department, startDate, endDate, includeFrozen } = req.query;

      const report = await reportService.generateHRBPReport({
        trainingId: trainingId as string,
        department: department as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        includeFrozen: includeFrozen !== 'false',
        generatedBy: req.user!.id,
        generatorName: req.user!.name,
        generatorRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      const excelBuffer = reportService.exportToExcel(report);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=hrbp-report-${Date.now()}.xlsx`
      );

      res.send(excelBuffer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/frozen',
  requirePermission('report:export'),
  async (req: AuthRequest, res) => {
    try {
      const { trainingId, department } = req.query;

      const report = await reportService.getFrozenReport({
        trainingId: trainingId as string,
        department: department as string,
        generatedBy: req.user!.id,
        generatorName: req.user!.name,
        generatorRole: req.user!.role
      });

      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
