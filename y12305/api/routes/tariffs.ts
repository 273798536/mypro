import express from 'express';
import { TariffService } from '../services/TariffService.js';

const router = express.Router();
const tariffService = new TariffService();

router.get('/', (_req, res) => {
  try {
    const tariffs = tariffService.getAll();
    res.json(tariffs);
  } catch (error) {
    res.status(500).json({ error: '获取电价表失败' });
  }
});

router.get('/active', (req, res) => {
  try {
    const referenceDate = req.query.date as string | undefined;
    const tariffs = tariffService.getActiveTariffs(referenceDate);
    res.json(tariffs);
  } catch (error) {
    res.status(500).json({ error: '获取有效电价表失败' });
  }
});

router.get('/expired', (_req, res) => {
  try {
    const tariffs = tariffService.getExpiredTariffs();
    res.json(tariffs);
  } catch (error) {
    res.status(500).json({ error: '获取过期电价表失败' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const tariff = tariffService.getById(req.params.id);
    if (!tariff) {
      res.status(404).json({ error: '未找到电价表' });
      return;
    }
    res.json(tariff);
  } catch (error) {
    res.status(500).json({ error: '获取电价表失败' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, type, effectiveFrom, effectiveTo, tiers } = req.body;

    if (!name || !type || !effectiveFrom || !effectiveTo || !tiers) {
      res.status(400).json({ error: '缺少必填字段' });
      return;
    }

    if (type !== 'step' && type !== 'tou') {
      res.status(400).json({ error: '电价表类型必须是 step 或 tou' });
      return;
    }

    const validation = tariffService.validateTiers(tiers, type);
    if (!validation.valid) {
      res.status(400).json({ error: '档位验证失败', details: validation.errors });
      return;
    }

    const newTariff = tariffService.create({
      name,
      type,
      effectiveFrom,
      effectiveTo,
      tiers,
    });

    res.status(201).json(newTariff);
  } catch (error) {
    res.status(500).json({ error: '创建电价表失败' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { tiers, type } = req.body;

    if (type && type !== 'step' && type !== 'tou') {
      res.status(400).json({ error: '电价表类型必须是 step 或 tou' });
      return;
    }

    if (tiers) {
      const existing = tariffService.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: '未找到电价表' });
        return;
      }
      const validationType = type || existing.type;
      const validation = tariffService.validateTiers(tiers, validationType);
      if (!validation.valid) {
        res.status(400).json({ error: '档位验证失败', details: validation.errors });
        return;
      }
    }

    const updated = tariffService.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: '未找到电价表' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新电价表失败' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const deleted = tariffService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: '未找到电价表' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除电价表失败' });
  }
});

export default router;
