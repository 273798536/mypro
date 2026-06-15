import { Router, type Request, type Response } from 'express';
import type { Multer } from 'multer';
import { z } from 'zod';
import * as materialRepo from '../repositories/materialRepo';
import * as locationRepo from '../repositories/locationRepo';
import { createNextVersion } from '../services/versionService';
import type { MaterialType } from '../../shared/types';

const VALID_TYPES: MaterialType[] = ['photo', 'boundary', 'verbal_note'];

export default function materialsRouterFactory(upload: Multer) {
  const router = Router();

  const createSchema = z.object({
    locationId: z.string().min(1, 'locationId 必填'),
    type: z.enum(['photo', 'boundary', 'verbal_note'], {
      required_error: 'type 必填'
    }),
    title: z.string().optional(),
    uploader: z.string().optional(),
    changeNote: z.string().optional()
  });

  router.get('/', (req: Request, res: Response): void => {
    const locationId = req.query.locationId as string | undefined;
    const type = req.query.type as string | undefined;
    let list = materialRepo.listMaterials();
    if (locationId) {
      list = list.filter((m) => m.locationId === locationId);
    }
    if (type && VALID_TYPES.includes(type as MaterialType)) {
      list = list.filter((m) => m.type === type);
    }
    res.json({ code: 0, data: list, msg: 'ok' });
  });

  router.post(
    '/',
    upload.single('file'),
    async (req: Request, res: Response): Promise<void> => {
      const formBody: Request['body'] = req.body || {};
      if (!req.file && formBody.type !== 'verbal_note' && formBody.type !== 'boundary') {
        // verbal_note 和 boundary 可以没有文件
      }

      const parsed = createSchema.safeParse({
        locationId: formBody.locationId,
        type: formBody.type,
        title: formBody.title,
        uploader: formBody.uploader,
        changeNote: formBody.changeNote
      });
      if (!parsed.success) {
        res.status(400).json({
          code: 400,
          data: null,
          msg: parsed.error.issues.map((i) => i.message).join('; ')
        });
        return;
      }

      const location = locationRepo.getLocationById(parsed.data.locationId);
      if (!location) {
        res.status(404).json({
          code: 404,
          data: null,
          msg: '未找到 location'
        });
        return;
      }

      let payload: any = { title: parsed.data.title };
      if (req.file) {
        payload = {
          ...payload,
          path: `/uploads/${req.file.filename}`,
          url: `/uploads/${req.file.filename}`,
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        };
      }

      const type = parsed.data.type as MaterialType;
      const existingCount = materialRepo.countByLocationAndType(
        parsed.data.locationId,
        type
      );

      let material;
      if (existingCount === 0) {
        material = materialRepo.createMaterial({
          locationId: parsed.data.locationId,
          type,
          version: 1,
          previousVersionId: null,
          payload,
          hasCaliberChange: 0,
          changeNote: parsed.data.changeNote ?? null,
          capturedAt: new Date().toISOString(),
          submittedBy: parsed.data.uploader ?? null
        });
      } else {
        material = await createNextVersion(
          parsed.data.locationId,
          type,
          {
            locationId: parsed.data.locationId,
            type,
            payload,
            changeNote: parsed.data.changeNote ?? null,
            capturedAt: new Date().toISOString(),
            submittedBy: parsed.data.uploader ?? null,
            createdAt: new Date().toISOString()
          }
        );
      }

      res.json({ code: 0, data: material, msg: '上传成功' });
    }
  );

  router.get('/:id/versions', (req: Request, res: Response): void => {
    const material = materialRepo.getMaterialById(req.params.id);
    if (!material) {
      res.status(404).json({ code: 404, data: null, msg: '未找到该 material' });
      return;
    }
    const versions = materialRepo.listVersionsByLocationAndType(
      material.locationId,
      material.type
    );
    res.json({ code: 0, data: versions, msg: 'ok' });
  });

  return router;
}
