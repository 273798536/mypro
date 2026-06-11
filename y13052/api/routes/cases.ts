import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import type { CaseListQuery, RejudgeRequest, SupplementRequest, ApiResponse } from '../../shared/types.js';
import { listCases, getCaseDetail, rejudgeCase, supplementRecord } from '../services/caseService.js';
import { fileTypeToMime, getFileStats, generateCaseReport } from '../store/fileStore.js';
import { getCaseById } from '../store/dataStore.js';

const router = Router();

function ok<T>(res: Response, data: T, message = 'ok') {
  const resp: ApiResponse<T> = {
    code: 0,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  res.json(resp);
}

function fail(res: Response, message: string, code = 1, status = 400) {
  res.status(status).json({
    code,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  });
}

router.get('/', (req: Request, res: Response) => {
  const query: CaseListQuery = {
    status: (req.query.status as CaseListQuery['status']) || undefined,
    objectType: (req.query.objectType as CaseListQuery['objectType']) || undefined,
    keyword: (req.query.keyword as string) || undefined,
  };
  ok(res, listCases(query));
});

router.get('/:id', (req: Request, res: Response) => {
  const detail = getCaseDetail(req.params.id);
  if (!detail) {
    return fail(res, '案件不存在', 2, 404);
  }
  ok(res, detail);
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const body = req.body as RejudgeRequest;
    if (!body.toStatus || !body.reason || !body.operator) {
      return fail(res, '缺少必填参数：toStatus / reason / operator');
    }
    if (!['approved', 'rejected', 'pending', 'abnormal'].includes(body.toStatus)) {
      return fail(res, '无效的改判状态');
    }
    const result = rejudgeCase(req.params.id, body);
    if (!result) {
      return fail(res, '案件不存在', 2, 404);
    }
    ok(res, result, `改判成功：已关联晚到附件 ${result.linkedAttachmentIds.length} 个`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    fail(res, `服务端错误：${message}`, 500, 500);
  }
});

router.post('/:id/supplement', async (req: Request, res: Response) => {
  try {
    const body = req.body as SupplementRequest;
    if (!body.operator || !body.reason) {
      return fail(res, '缺少必填参数：operator / reason');
    }
    const result = await supplementRecord(req.params.id, body);
    if (!result) {
      return fail(res, '案件不存在', 2, 404);
    }
    ok(res, result, `补录成功：新增照片 ${result.addedPhotos} 张 + 附件 ${result.addedAttachments} 个`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    fail(res, `服务端错误：${message}`, 500, 500);
  }
});

router.get('/:id/attachments/:attId/download', async (req: Request, res: Response) => {
  try {
    const cs = getCaseById(req.params.id);
    if (!cs) return fail(res, '案件不存在', 2, 404);
    const att = cs.attachments.find((a) => a.id === req.params.attId);
    if (!att) return fail(res, '附件不存在', 3, 404);
    if (!att.filePath || !fs.existsSync(att.filePath)) {
      return fail(res, '附件文件未找到或尚未生成', 4, 404);
    }
    const stats = getFileStats(att.filePath);
    if (!stats.exists) return fail(res, '附件文件不存在', 4, 404);

    const mime = fileTypeToMime(att.fileType);
    const encodedName = encodeURIComponent(att.fileName);
    res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(stats.size || att.fileSize || 0));
    res.setHeader('Cache-Control', 'private, max-age=86400');
    fs.createReadStream(att.filePath).pipe(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    fail(res, `下载失败：${message}`, 500, 500);
  }
});

router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const cs = getCaseById(req.params.id);
    if (!cs) return fail(res, '案件不存在', 2, 404);
    const format = (req.query.format as 'pdf' | 'csv' | 'html') || 'pdf';
    if (!['pdf', 'csv', 'html'].includes(format)) {
      return fail(res, '无效的导出格式，仅支持 pdf、csv 或 html', 5, 400);
    }
    const result = await generateCaseReport(cs, format);
    const encodedName = encodeURIComponent(result.fileName);
    res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
    res.setHeader('Content-Type', result.mime);
    res.setHeader('Content-Length', String(result.fileSize));
    res.setHeader('Cache-Control', 'private, max-age=86400');
    fs.createReadStream(result.filePath).pipe(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    fail(res, `导出失败：${message}`, 500, 500);
  }
});

router.get('/:id/photos', (req: Request, res: Response) => {
  const detail = getCaseDetail(req.params.id);
  if (!detail) return fail(res, '案件不存在', 2, 404);
  ok(res, detail.photos);
});

router.get('/:id/timeline', (req: Request, res: Response) => {
  const detail = getCaseDetail(req.params.id);
  if (!detail) return fail(res, '案件不存在', 2, 404);
  ok(res, detail.timeline);
});

router.get('/:id/attachments', (req: Request, res: Response) => {
  const detail = getCaseDetail(req.params.id);
  if (!detail) return fail(res, '案件不存在', 2, 404);
  ok(res, detail.attachments);
});

export default router;
