const express = require('express');
const router = express.Router();
const materialService = require('../services/materialService');
const { MATERIAL_TYPES } = require('../dao/materialDao');

router.post('/import', async (req, res) => {
  try {
    const { type, source_env, title, content, import_batch, remark, operator } = req.body;

    if (!type || !source_env || !title || !content || !import_batch || !operator) {
      return res.status(400).json({ error: '缺少必要参数: type, source_env, title, content, import_batch, operator' });
    }

    if (!Object.values(MATERIAL_TYPES).includes(type)) {
      return res.status(400).json({ error: '无效的材料类型' });
    }

    const material = await materialService.importMaterial(
      { type, source_env, title, content, import_batch, remark },
      operator
    );

    res.json({ success: true, data: material });
  } catch (err) {
    console.error('导入材料失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch-import', async (req, res) => {
  try {
    const { materials, import_batch, operator } = req.body;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ error: 'materials 必须是非空数组' });
    }
    if (!import_batch || !operator) {
      return res.status(400).json({ error: '缺少 import_batch 或 operator' });
    }

    const results = await materialService.importBatch(materials, import_batch, operator);

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    console.error('批量导入材料失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { type, source_env, is_latest } = req.query;
    const filters = {};
    if (type) filters.type = type;
    if (source_env) filters.source_env = source_env;
    if (is_latest !== undefined) filters.is_latest = is_latest === 'true';

    const materials = await materialService.listMaterials(filters);
    res.json({ success: true, data: materials });
  } catch (err) {
    console.error('查询材料列表失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const material = await materialService.getMaterial(req.params.id);
    if (!material) {
      return res.status(404).json({ error: '材料不存在' });
    }
    res.json({ success: true, data: material });
  } catch (err) {
    console.error('查询材料失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await materialService.getMaterialVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (err) {
    console.error('查询材料版本历史失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/update-version', async (req, res) => {
  try {
    const { content, operator, remark } = req.body;

    if (!content || !operator) {
      return res.status(400).json({ error: '缺少 content 或 operator' });
    }

    const newMaterial = await materialService.updateMaterialVersion(
      req.params.id,
      content,
      operator,
      remark
    );

    res.json({ success: true, data: newMaterial });
  } catch (err) {
    console.error('更新材料版本失败:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
