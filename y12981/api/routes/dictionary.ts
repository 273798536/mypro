import express from 'express';
import dictionaryService from '../services/DictionaryService';

const router = express.Router();

const DEFAULT_USER = { id: 'u003', name: '王芳' };

router.get('/', (req, res) => {
  try {
    const items = dictionaryService.getAll();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = dictionaryService.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { value, reason } = req.body;
    
    if (!value) {
      return res.status(400).json({ success: false, error: 'value is required' });
    }
    
    const updated = dictionaryService.update(
      id,
      value.toString(),
      DEFAULT_USER.id,
      DEFAULT_USER.name,
      reason || '更新阈值配置'
    );
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:id/history', (req, res) => {
  try {
    const { id } = req.params;
    const history = dictionaryService.getVersionHistory(id);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:id/compare/:v1/:v2', (req, res) => {
  try {
    const { id, v1, v2 } = req.params;
    const comparison = dictionaryService.compareVersions(
      id,
      parseInt(v1),
      parseInt(v2)
    );
    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:id/compare-latest', (req, res) => {
  try {
    const { id } = req.params;
    const comparison = dictionaryService.getLatestComparison(id);
    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
