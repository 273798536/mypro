import { Router, type Request, type Response } from 'express';
import { ExportService } from '../services/ExportService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { ApiResponse, ExportTask } from '../../shared/types/index.js';

const router = Router();
const exportService = new ExportService();

router.post(
  '/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const { recordIds, taskName, exportType, operator } = req.body;

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      throw new AppError('请选择要导出的记录', 400);
    }

    if (!taskName) {
      throw new AppError('请提供任务名称', 400);
    }

    if (!exportType || !['excel', 'pdf'].includes(exportType)) {
      throw new AppError('请指定正确的导出格式: excel, pdf', 400);
    }

    if (!operator) {
      throw new AppError('请提供操作人', 400);
    }

    let task: ExportTask;

    if (exportType === 'excel') {
      task = await exportService.generateExcel(recordIds, taskName, operator);
    } else {
      task = await exportService.generatePDF(recordIds, taskName, operator);
    }

    const response: ApiResponse<ExportTask> = {
      success: true,
      data: task,
      message: '导出任务已创建，正在处理中',
    };

    res.status(202).json(response);
  })
);

router.get(
  '/tasks',
  asyncHandler(async (req: Request, res: Response) => {
    const tasks = exportService.getExportTasks();

    const response: ApiResponse<ExportTask[]> = {
      success: true,
      data: tasks,
    };

    res.status(200).json(response);
  })
);

router.get(
  '/download/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const downloadInfo = exportService.getDownloadPath(id);

    if (!downloadInfo) {
      throw new AppError('文件不存在或导出任务未完成', 404);
    }

    res.download(downloadInfo.filePath, downloadInfo.fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          error: '文件下载失败',
        });
      }
    });
  })
);

export default router;
