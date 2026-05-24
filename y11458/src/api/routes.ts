import { Router, Request, Response } from 'express';
import moment from 'moment';
import { AfterSalesService } from '../services/AfterSalesService';
import { DataProcessor } from '../services/DataProcessor';
import { ExportService } from '../services/ExportService';

export function createRoutes(dbPath: string, exportDir: string): Router {
  const router = Router();
  const afterSalesService = new AfterSalesService(dbPath);
  const dataProcessor = new DataProcessor(dbPath);
  const exportService = new ExportService(exportDir, dbPath);

  const createResponse = (success: boolean, data?: any, message: string = '') => ({
    success,
    data,
    message,
    timestamp: moment().toISOString()
  });

  router.get('/health', (req: Request, res: Response) => {
    res.json(createResponse(true, { status: 'ok' }, '服务运行正常'));
  });

  router.get('/statistics', async (req: Request, res: Response) => {
    try {
      const { city } = req.query;
      const stats = await afterSalesService.getStatistics(city as string);
      res.json(createResponse(true, stats));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/orders', async (req: Request, res: Response) => {
    try {
      const orderNo = await afterSalesService.createOrder(req.body);
      res.json(createResponse(true, { orderNo }, '创建成功'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.get('/orders', async (req: Request, res: Response) => {
    try {
      const { page = '1', pageSize = '20', city, status, leaderId } = req.query;
      const result = await afterSalesService.getOrderList({
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        city: city as string,
        status: status as string,
        leaderId: leaderId as string
      });
      res.json(createResponse(true, result));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.get('/orders/:orderNo', async (req: Request, res: Response) => {
    try {
      const { orderNo } = req.params;
      const detail = await afterSalesService.getOrderDetail(orderNo);
      if (!detail) {
        return res.status(404).json(createResponse(false, null, '售后单不存在'));
      }
      res.json(createResponse(true, detail));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/orders/:orderNo/leader-refund', async (req: Request, res: Response) => {
    try {
      const { orderNo } = req.params;
      const success = await afterSalesService.submitLeaderRefund(orderNo, req.body);
      res.json(createResponse(success, null, success ? '提交成功' : '提交失败'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/orders/:orderNo/warehouse-review', async (req: Request, res: Response) => {
    try {
      const { orderNo } = req.params;
      const success = await afterSalesService.warehouseReview(orderNo, req.body);
      res.json(createResponse(success, null, success ? '复核成功' : '复核失败'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/orders/:orderNo/refund', async (req: Request, res: Response) => {
    try {
      const { orderNo } = req.params;
      const success = await afterSalesService.processRefund(orderNo, req.body);
      res.json(createResponse(success, null, success ? '退款成功' : '退款失败'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/orders/:orderNo/remarks', async (req: Request, res: Response) => {
    try {
      const { orderNo } = req.params;
      const success = await afterSalesService.addUserRemark(orderNo, req.body);
      res.json(createResponse(success, null, success ? '备注添加成功' : '备注添加失败'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.get('/orders/:orderNo/status-logs', async (req: Request, res: Response) => {
    try {
      const { orderNo } = req.params;
      const logs = await dataProcessor.getStatusHistory(orderNo);
      res.json(createResponse(true, logs));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/dirty-records/detect', async (req: Request, res: Response) => {
    try {
      const records = await dataProcessor.detectDirtyRecords();
      res.json(createResponse(true, { count: records.length, records }, '脏数据检测完成'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.get('/dirty-records', async (req: Request, res: Response) => {
    try {
      const { orderNo, isResolved } = req.query;
      const records = await dataProcessor.getDirtyRecords(
        orderNo as string,
        isResolved !== undefined ? isResolved === 'true' : undefined
      );
      res.json(createResponse(true, records));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/dirty-records/:dirtyId/resolve', async (req: Request, res: Response) => {
    try {
      const { dirtyId } = req.params;
      const { resolverId, resolverName, remark, correctedValue, reReconcile } = req.body;
      const result = await dataProcessor.resolveDirtyRecord({
        dirtyId,
        resolverId,
        resolverName,
        remark,
        correctedValue,
        reReconcile
      });
      res.json(createResponse(result.success, result, result.message));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/reconciliation', async (req: Request, res: Response) => {
    try {
      const { orderNo } = req.body;
      if (orderNo) {
        const result = await dataProcessor.reconcileOrder(orderNo);
        res.json(createResponse(true, result, '对账完成'));
      } else {
        const results = await dataProcessor.reconcileAll();
        res.json(createResponse(true, { count: results.length, results }, '批量对账完成'));
      }
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.get('/reconciliation', async (req: Request, res: Response) => {
    try {
      const { orderNo, isMatched } = req.query;
      const records = await dataProcessor.getReconciliationResults(
        orderNo as string,
        isMatched !== undefined ? isMatched === 'true' : undefined
      );
      res.json(createResponse(true, records));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/export/orders', async (req: Request, res: Response) => {
    try {
      const { city, status } = req.body;
      const filePath = await exportService.exportOrders(city, status);
      res.json(createResponse(true, { filePath }, '导出成功'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/export/orders/:orderNo', async (req: Request, res: Response) => {
    try {
      const { orderNo } = req.params;
      const filePath = await exportService.exportOrderDetail(orderNo);
      res.json(createResponse(true, { filePath }, '导出成功'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/export/dirty-records', async (req: Request, res: Response) => {
    try {
      const { isResolved } = req.body;
      const filePath = await exportService.exportDirtyRecords(
        isResolved !== undefined ? isResolved : undefined
      );
      res.json(createResponse(true, { filePath }, '导出成功'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/export/reconciliation', async (req: Request, res: Response) => {
    try {
      const { city } = req.body;
      const filePath = await exportService.exportReconciliationReport(city);
      res.json(createResponse(true, { filePath }, '导出成功'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  router.post('/export/status-logs', async (req: Request, res: Response) => {
    try {
      const { orderNo } = req.body;
      const filePath = await exportService.exportStatusLogs(orderNo);
      res.json(createResponse(true, { filePath }, '导出成功'));
    } catch (error: any) {
      res.status(500).json(createResponse(false, null, error.message));
    }
  });

  return router;
}
