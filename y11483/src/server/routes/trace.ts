import { Router, Request, Response } from 'express';
import { BatchTraceService } from '../../services/BatchTraceService';
import { ExportService } from '../../services/ExportService';
import { ConflictStrategy, ExportFormat, ExportType } from '../../entities';

const router = Router();
const traceService = new BatchTraceService();
const exportService = new ExportService();

router.post('/create', async (req: Request, res: Response, next) => {
  try {
    const {
      batchNo,
      potNo,
      productName,
      productionTime,
      conflictStrategy,
    } = req.body;

    if (!batchNo || !potNo || !productName) {
      return res.status(400).json({
        error: 'Missing required fields: batchNo, potNo, productName',
      });
    }

    const trace = await traceService.createTrace({
      batchNo,
      potNo,
      productName,
      productionTime: productionTime ? new Date(productionTime) : new Date(),
      conflictStrategy: conflictStrategy as ConflictStrategy,
      operator: req.operator!,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: trace,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/process', async (req: Request, res: Response, next) => {
  try {
    const { traceNo } = req.body;

    if (!traceNo) {
      return res.status(400).json({ error: 'traceNo is required' });
    }

    const trace = await traceService.processTrace({
      traceNo,
      operator: req.operator!,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: trace,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:traceNo', async (req: Request, res: Response, next) => {
  try {
    const { traceNo } = req.params;
    const trace = await traceService.getTrace(traceNo);

    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    res.json({
      success: true,
      data: trace,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/batch/:batchNo/:potNo', async (req: Request, res: Response, next) => {
  try {
    const { batchNo, potNo } = req.params;
    const trace = await traceService.getTraceByBatchPot(batchNo, potNo);

    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    res.json({
      success: true,
      data: trace,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:traceNo/stores', async (req: Request, res: Response, next) => {
  try {
    const { traceNo } = req.params;
    const stores = await traceService.getTraceStores(traceNo);

    res.json({
      success: true,
      data: stores,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:traceNo/history', async (req: Request, res: Response, next) => {
  try {
    const { traceNo } = req.params;
    const history = await traceService.getTraceHistory(traceNo);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/manual-judge', async (req: Request, res: Response, next) => {
  try {
    const { traceNo, judgment, reason } = req.body;

    if (!traceNo || !judgment || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: traceNo, judgment, reason',
      });
    }

    const trace = await traceService.manualJudge({
      traceNo,
      operator: req.operator!,
      reason,
      judgment,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: trace,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/freeze', async (req: Request, res: Response, next) => {
  try {
    const { traceNo, reason } = req.body;

    if (!traceNo || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: traceNo, reason',
      });
    }

    const trace = await traceService.freezeTrace({
      traceNo,
      operator: req.operator!,
      reason,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: trace,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/unfreeze', async (req: Request, res: Response, next) => {
  try {
    const { traceNo, reason } = req.body;

    if (!traceNo || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: traceNo, reason',
      });
    }

    const trace = await traceService.unfreezeTrace(
      traceNo,
      req.operator!,
      reason,
      req.requestId
    );

    res.json({
      success: true,
      data: trace,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/export/create', async (req: Request, res: Response, next) => {
  try {
    const { traceNo, format, exportType } = req.body;

    if (!traceNo || !format) {
      return res.status(400).json({
        error: 'Missing required fields: traceNo, format',
      });
    }

    const exportRecord = await exportService.createExport({
      exportType: (exportType as ExportType) || ExportType.FULL_TRACE,
      format: format as ExportFormat,
      traceNo,
      operator: req.operator!,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: exportRecord,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/export/execute', async (req: Request, res: Response, next) => {
  try {
    const { exportNo } = req.body;

    if (!exportNo) {
      return res.status(400).json({ error: 'exportNo is required' });
    }

    const result = await exportService.executeExport(
      exportNo,
      req.operator!,
      req.requestId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await traceService.listTraces(page, pageSize);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        pageSize,
        total: result.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;