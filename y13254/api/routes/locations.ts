import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import * as locationRepo from '../repositories/locationRepo';
import { fuzzyMatch, pointInPolygon, detectCrossStreet } from '../lib/match';

const router = Router();

const createLocationSchema = z.object({
  canonicalName: z.string().min(1, 'canonicalName 不能为空'),
  aliases: z.array(z.string()).default([]),
  lng: z.number({ required_error: 'lng 必填' }),
  lat: z.number({ required_error: 'lat 必填' }),
  boundaryGeoJSON: z.any()
});

const updateAliasesSchema = z.object({
  aliases: z.array(z.string())
});

const checkCoordSchema = z.object({
  lng: z.number(),
  lat: z.number()
});

router.get('/', (req: Request, res: Response): void => {
  const keyword = req.query.keyword as string | undefined;
  const all = locationRepo.listLocations();
  let data = all;
  if (keyword && keyword.trim()) {
    data = fuzzyMatch(keyword.trim(), all);
  }
  res.json({ code: 0, data, msg: 'ok' });
});

router.post('/', (req: Request, res: Response): void => {
  const parsed = createLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      code: 400,
      data: null,
      msg: parsed.error.issues.map((i) => i.message).join('; ')
    });
    return;
  }
  const created = locationRepo.createLocation(parsed.data as any);
  res.json({ code: 0, data: created, msg: '创建成功' });
});

router.put('/:id/aliases', (req: Request, res: Response): void => {
  const parsed = updateAliasesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      code: 400,
      data: null,
      msg: parsed.error.issues.map((i) => i.message).join('; ')
    });
    return;
  }
  const updated = locationRepo.updateAliases(req.params.id, parsed.data.aliases);
  if (!updated) {
    res.status(404).json({ code: 404, data: null, msg: '未找到该 location' });
    return;
  }
  res.json({ code: 0, data: updated, msg: '更新别名成功' });
});

router.post('/:id/check-coordinate', (req: Request, res: Response): void => {
  const location = locationRepo.getLocationById(req.params.id);
  if (!location) {
    res.status(404).json({ code: 404, data: null, msg: '未找到该 location' });
    return;
  }
  const parsed = checkCoordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      code: 400,
      data: null,
      msg: parsed.error.issues.map((i) => i.message).join('; ')
    });
    return;
  }
  const { lng, lat } = parsed.data;
  const insideOwnBoundary = pointInPolygon(lng, lat, location.boundaryGeoJSON);
  const allLocations = locationRepo.listLocations();
  const tempLoc = { ...location, lng, lat };
  const crossStreetResult = detectCrossStreet(tempLoc, allLocations);

  let suggestion: string;
  if (!insideOwnBoundary) {
    suggestion = '坐标不在当前边界内，建议重新测绘坐标或调整边界';
  } else if (crossStreetResult.isCross) {
    suggestion = `坐标疑似偏到隔壁街「${crossStreetResult.hitName ?? ''}」，建议人工复核`;
  } else {
    suggestion = '坐标正常，在自己边界内';
  }

  res.json({
    code: 0,
    data: {
      insideOwnBoundary,
      crossStreetResult,
      suggestion
    },
    msg: 'ok'
  });
});

export default router;
