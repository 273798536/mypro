import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { materialService } from './services/material.service.js';
import { chainService } from './services/chain.service.js';
import { dirtyDataService } from './services/dirty-data.service.js';
import { reconciliationService } from './services/reconciliation.service.js';
import { exportService } from './services/export.service.js';
import { auditService } from './services/audit.service.js';
import type { MaterialType, HandleMode, ExportFormat } from '@prisma/client';

const router = Router();

const getOperator = (req: Request) => ({
  id: (req.headers['x-operator-id'] as string) || 'user-001',
  name: (req.headers['x-operator-name'] as string) || '演示用户',
});

const validate = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await chainService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/materials/import',
  body('type').isIn(['ORDER', 'TRACK', 'IOU', 'STATEMENT', 'EMAIL']),
  body('rawContent').exists(),
  body('parsedData').exists(),
  body('handleMode').optional().isIn(['OVERWRITE', 'IGNORE']),
  validate,
  async (req: Request, res: Response) => {
    try {
      const operator = getOperator(req);
      const { type, rawContent, parsedData, sourceFile, handleMode } = req.body;

      const result = await materialService.importMaterial(
        type as MaterialType,
        rawContent,
        parsedData,
        sourceFile,
        handleMode as HandleMode || 'IGNORE',
        operator.id,
        operator.name,
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.get('/materials',
  query('type').optional(),
  query('storeName').optional(),
  query('page').optional().isInt(),
  query('pageSize').optional().isInt(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const { type, storeName, page, pageSize } = req.query;
      const result = await materialService.getMaterials({
        type: type as MaterialType,
        storeName: storeName as string,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.get('/materials/:id', async (req, res) => {
  try {
    const material = await materialService.getMaterial(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/materials/:id',
  body('parsedData').exists(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const operator = getOperator(req);
      const material = await materialService.updateMaterial(
        req.params.id,
        req.body.parsedData,
        operator.id,
        operator.name,
      );
      res.json(material);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.post('/chains/generate',
  body('storeName').isString(),
  body('businessDate').isString(),
  body('materialIds').isArray(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const operator = getOperator(req);
      const { storeName, businessDate, materialIds } = req.body;
      const chain = await chainService.generateChain(
        storeName,
        businessDate,
        materialIds,
        operator.id,
        operator.name,
      );
      res.json(chain);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.get('/chains',
  query('storeName').optional(),
  query('status').optional(),
  query('startDate').optional(),
  query('endDate').optional(),
  query('page').optional().isInt(),
  query('pageSize').optional().isInt(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const { storeName, status, startDate, endDate, page, pageSize } = req.query;
      const result = await chainService.getChainList({
        storeName: storeName as string,
        status: status as any,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.get('/chains/:id', async (req, res) => {
  try {
    const includeTechView = req.headers['x-include-tech-view'] === 'true';
    const chain = await chainService.getChainDetail(req.params.id, includeTechView);
    if (!chain) {
      return res.status(404).json({ error: 'Chain not found' });
    }
    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/chains/:id/timeline', async (req, res) => {
  try {
    const chain = await chainService.getChainDetail(req.params.id);
    if (!chain) {
      return res.status(404).json({ error: 'Chain not found' });
    }
    res.json({ timeline: chain.timeline });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/dirty-data',
  query('status').optional(),
  query('type').optional(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const { status, type } = req.query;
      const list = await dirtyDataService.getDirtyDataList(
        status as any,
        type as any,
      );
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.post('/dirty-data/:id/fix',
  body('finalValue').exists(),
  body('fixNote').isString(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const operator = getOperator(req);
      const { finalValue, fixNote } = req.body;
      const result = await dirtyDataService.fixDirtyData(
        req.params.id,
        finalValue,
        fixNote,
        operator.id,
        operator.name,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.post('/dirty-data/:id/ignore',
  body('fixNote').isString(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const operator = getOperator(req);
      const { fixNote } = req.body;
      const result = await dirtyDataService.ignoreDirtyData(
        req.params.id,
        fixNote,
        operator.id,
        operator.name,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.post('/reconciliation/start',
  body('chainId').isString(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const operator = getOperator(req);
      const { chainId } = req.body;
      const result = await reconciliationService.startReconciliation(
        chainId,
        operator.id,
        operator.name,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.get('/reconciliation/:chainId', async (req, res) => {
  try {
    const result = await reconciliationService.getReconciliation(req.params.chainId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/reconciliation/:chainId/confirm',
  body('confirmedData').exists(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const operator = getOperator(req);
      const { confirmedData } = req.body;
      const result = await reconciliationService.confirmReconciliation(
        req.params.chainId,
        confirmedData,
        operator.id,
        operator.name,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.post('/export/generate',
  body('chainIds').isArray(),
  body('format').isIn(['EXCEL', 'JSON', 'CSV']),
  validate,
  async (req: Request, res: Response) => {
    try {
      const operator = getOperator(req);
      const { chainIds, format } = req.body;
      const result = await exportService.generateExport(
        chainIds,
        format as ExportFormat,
        operator.id,
        operator.name,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

router.get('/export/tasks', async (req, res) => {
  try {
    const result = await exportService.getExportTasks();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/export/download/:taskId', async (req, res) => {
  try {
    const filePath = await exportService.getExportFilePath(req.params.taskId);
    if (!filePath) {
      return res.status(404).json({ error: 'Export not found' });
    }
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/audit/status-history/:chainId', async (req, res) => {
  try {
    const history = await auditService.getStatusHistory(req.params.chainId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/tech-view/http-logs', async (req, res) => {
  try {
    const { chainId } = req.query;
    const logs = await auditService.getHttpLogs(chainId as string | undefined);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/tech-view/sql-logs', async (req, res) => {
  try {
    const { chainId } = req.query;
    const logs = await auditService.getSqlLogs(chainId as string | undefined);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/tech-view/commands', async (req, res) => {
  try {
    const commands = await auditService.getCommands();
    res.json(commands);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
