import { Request, Response } from 'express';
import ExportService from '../services/exportService';
import AuditService from '../services/auditService';

const exportService = new ExportService();
const auditService = new AuditService();

const currentUser = 'admin';

export const exportExcel = async (_req: Request, res: Response) => {
  try {
    const buffer = await exportService.exportExcel();
    const filename = `版权过滤清单_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: '导出Excel失败', message: (error as Error).message });
  }
};

export const exportPDF = async (_req: Request, res: Response) => {
  try {
    const buffer = await exportService.exportPDF();
    const filename = `直播点歌版权过滤报告_${new Date().toISOString().slice(0, 10)}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: '导出PDF失败', message: (error as Error).message });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, entityType, action } = req.query;
    const params = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      entityType: entityType as string | undefined,
      action: action as string | undefined,
    };
    
    const auditServiceInstance = new AuditService();
    const result = auditServiceInstance.findAll(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取操作日志失败', message: (error as Error).message });
  }
};
