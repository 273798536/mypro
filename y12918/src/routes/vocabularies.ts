import { Router, Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import * as vocabService from '../services/vocabulary';
import { successResponse, errorResponse } from '../utils/response';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = vocabService.listVocabularies(page, pageSize);
    successResponse(res, result);
  } catch (e) {
    errorResponse(res, (e as Error).message, 500);
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const item = vocabService.getVocabularyById(id);
    if (!item) {
      errorResponse(res, '领域词表不存在', 404);
      return;
    }
    successResponse(res, item);
  } catch (e) {
    errorResponse(res, (e as Error).message, 500);
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, domain } = req.body;
    if (!name || !domain) {
      errorResponse(res, '词表名称和领域都不能为空', 400);
      return;
    }
    const id = vocabService.createVocabulary(name, domain);
    successResponse(res, { id }, '创建成功');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

router.post('/:id/import', upload.single('file'), (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const vocab = vocabService.getVocabularyById(id);
    if (!vocab) {
      errorResponse(res, '领域词表不存在', 404);
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
      term: r.term || r['词条'] || r.word,
      category: r.category || r['分类'] || r.type,
    }));

    const result = vocabService.importVocabTerms(id, importRows);
    successResponse(res, result, '导入完成');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

router.get('/:id/terms', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const category = req.query.category as string | undefined;
    const result = vocabService.listVocabTerms(id, page, pageSize, category);
    successResponse(res, result);
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 500);
  }
});

export default router;
