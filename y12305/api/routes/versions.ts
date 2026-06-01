import express from 'express';
import { VersionService } from '../services/VersionService.js';

const router = express.Router();
const versionService = new VersionService();

router.get('/', (_req, res) => {
  try {
    const versions = versionService.getAll();
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

router.get('/tariff/:tariffId', (req, res) => {
  try {
    const versions = versionService.getVersionsByTariff(req.params.tariffId);
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

router.get('/usage/:usageId', (req, res) => {
  try {
    const versions = versionService.getVersionsByUsageRecord(req.params.usageId);
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

router.get('/compare', (req, res) => {
  try {
    const ids = req.query.ids as string;
    if (!ids) {
      res.status(400).json({ error: '请提供 ids 参数（逗号分隔的两个版本ID）' });
      return;
    }

    const [idA, idB] = ids.split(',');
    if (!idA || !idB) {
      res.status(400).json({ error: '请提供两个版本ID进行对比' });
      return;
    }

    const result = versionService.compareVersions(idA, idB);
    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '版本对比失败' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const version = versionService.getById(req.params.id);
    if (!version) {
      res.status(404).json({ error: '未找到版本' });
      return;
    }
    res.json(version);
  } catch (error) {
    res.status(500).json({ error: '获取版本失败' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const deleted = versionService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: '未找到版本' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除版本失败' });
  }
});

export default router;
