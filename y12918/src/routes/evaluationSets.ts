import { Router, Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import * as evalSetService from '../services/evaluationSet';
import { successResponse, errorResponse } from '../utils/response';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = evalSetService.listEvaluationSets(page, pageSize);
    successResponse(res, result);
  } catch (e) {
    errorResponse(res, (e as Error).message, 500);
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const item = evalSetService.getEvaluationSetById(id);
    if (!item) {
      errorResponse(res, '评测集不存在', 404);
      return;
    }
    successResponse(res, item);
  } catch (e) {
    errorResponse(res, (e as Error).message, 500);
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, source } = req.body;
    if (!name) {
      errorResponse(res, '评测集名称不能为空', 400);
      return;
    }
    const id = evalSetService.createEvaluationSet(name, description, source);
    successResponse(res, { id }, '创建成功');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

router.post('/:id/import', upload.single('file'), (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const evalSet = evalSetService.getEvaluationSetById(id);
    if (!evalSet) {
      errorResponse(res, '评测集不存在', 404);
      return;
    }

    let rows: Array<Record<string, string>> = [];

    if (req.file) {
      const content = req.file.buffer.toString('utf-8');
      rows = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else if (req.body.rows && Array.isArray(req.body.rows)) {
      rows = req.body.rows;
    } else {
      errorResponse(res, '请上传CSV文件或提供rows数据', 400);
      return;
    }

    const importRows = rows.map((r) => ({
      question_id: r.question_id || r['题目ID'] || r.id,
      question_text: r.question_text || r['题目内容'] || r.text,
      domain_tags: r.domain_tags || r['领域标签'] || r.tags,
      annotation_status: (r.annotation_status || r['标注状态'] || 'none') as any,
      annotation_note: r.annotation_note || r['标注说明'],
    }));

    const result = evalSetService.importQuestions(id, importRows);
    successResponse(res, result, '导入完成');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

router.get('/:id/questions', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const annotationStatus = req.query.annotationStatus as string | undefined;
    const result = evalSetService.listQuestions(id, page, pageSize, annotationStatus);
    successResponse(res, result);
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 500);
  }
});

router.put('/:id/questions/:questionId/annotation', (req: Request, res: Response) => {
  try {
    const evalSetId = parseInt(req.params.id);
    const questionId = req.params.questionId;
    const { annotation_status, domain_tags, annotation_note } = req.body;

    if (!annotation_status) {
      errorResponse(res, '标注状态不能为空', 400);
      return;
    }

    const result = evalSetService.updateQuestionAnnotation(
      evalSetId,
      questionId,
      annotation_status,
      domain_tags,
      annotation_note
    );
    successResponse(res, result, '标注更新成功');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

export default router;
