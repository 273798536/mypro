import { Request, Response } from 'express';
import { SourceFileType } from '@prisma/client';
import { FileUploadService } from '../services/file-upload.service';

export class FileController {
  static async upload(req: Request, res: Response) {
    try {
      const { batchId } = req.params;
      const { fileType } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: '参数错误',
          message: '请上传文件',
        });
      }

      if (!fileType || !Object.values(SourceFileType).includes(fileType)) {
        return res.status(400).json({
          error: '参数错误',
          message: `无效的文件类型，支持的类型: ${Object.values(SourceFileType).join(', ')}`,
        });
      }

      const result = await FileUploadService.uploadFile(
        batchId,
        file,
        fileType as SourceFileType,
        req.user!
      );

      res.json({
        success: true,
        message: `文件上传成功，解析了 ${result.parsedCount} 条记录`,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        error: '文件上传失败',
        message: error.message,
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { fileId } = req.params;

      await FileUploadService.deleteFile(fileId, req.user!);

      res.json({
        success: true,
        message: '文件已删除',
      });
    } catch (error: any) {
      res.status(400).json({
        error: '删除文件失败',
        message: error.message,
      });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const { batchId } = req.params;

      const files = await FileUploadService.getBatchFiles(batchId);

      res.json({
        success: true,
        data: files,
      });
    } catch (error: any) {
      res.status(500).json({
        error: '获取文件列表失败',
        message: error.message,
      });
    }
  }
}
