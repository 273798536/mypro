import { Router, Request, Response } from 'express';
import multer from 'multer';
import { MaterialService } from '../services/material-service';
import { MaterialType, ProcessResult } from '../types';
import Joi from 'joi';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const setResultSchema = Joi.object({
  result: Joi.string().valid(...Object.values(ProcessResult)).required(),
  processNote: Joi.string().required(),
  operatedBy: Joi.string().required()
});

const deleteSchema = Joi.object({
  operatedBy: Joi.string().required(),
  reason: Joi.string().required()
});

router.post('/:batchId/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const type = req.body.type as MaterialType;
    if (!Object.values(MaterialType).includes(type)) {
      return res.status(400).json({ error: '无效的材料类型' });
    }

    const uploadedBy = req.body.uploadedBy || 'system';
    const isSensitive = req.body.isSensitive === 'true';

    const material = await MaterialService.uploadMaterial(
      req.params.batchId,
      type,
      req.file.buffer,
      req.file.originalname,
      uploadedBy,
      isSensitive
    );

    res.status(201).json(material);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/batch/:batchId', async (req: Request, res: Response) => {
  try {
    const materials = await MaterialService.getMaterialsByBatchId(req.params.batchId);
    res.json(materials);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const material = await MaterialService.getMaterialById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: '材料不存在' });
    }
    res.json(material);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/result', async (req: Request, res: Response) => {
  try {
    const { error, value } = setResultSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const material = await MaterialService.setMaterialProcessResult(
      req.params.id,
      value.result,
      value.processNote,
      value.operatedBy
    );

    res.json(material);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error, value } = deleteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    await MaterialService.deleteMaterial(
      req.params.id,
      value.operatedBy,
      value.reason
    );

    res.json({ message: '材料已删除' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const batchId = req.query.batchId as string | undefined;
    const stats = await MaterialService.getMaterialStats(batchId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
