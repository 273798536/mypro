const express = require('express');
const router = express.Router();
const migrationService = require('../services/migrationService');

router.post('/', async (req, res) => {
  try {
    const { migration_name, environment, execution_count, operator } = req.body;

    if (!migration_name || !environment || !operator) {
      return res.status(400).json({ error: '缺少必要参数: migration_name, environment, operator' });
    }

    const migration = await migrationService.createMigration(
      { migration_name, environment, execution_count: execution_count || 1 },
      operator
    );

    res.json({ success: true, data: migration });
  } catch (err) {
    console.error('创建迁移记录失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, environment } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (environment) filters.environment = environment;

    const migrations = await migrationService.listMigrations(filters);
    res.json({ success: true, data: migrations });
  } catch (err) {
    console.error('查询迁移记录列表失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const migration = await migrationService.getMigration(req.params.id);
    if (!migration) {
      return res.status(404).json({ error: '迁移记录不存在' });
    }
    res.json({ success: true, data: migration });
  } catch (err) {
    console.error('查询迁移记录失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/start-review', async (req, res) => {
  try {
    const { reviewer } = req.body;
    if (!reviewer) {
      return res.status(400).json({ error: '缺少 reviewer' });
    }

    const result = await migrationService.startReview(req.params.id, reviewer);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('开始复核失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const { operator, reason } = req.body;
    if (!operator) {
      return res.status(400).json({ error: '缺少 operator' });
    }

    const migration = await migrationService.approveMigration(req.params.id, operator, reason);
    res.json({ success: true, data: migration });
  } catch (err) {
    console.error('审批通过失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const { operator, reason } = req.body;
    if (!operator) {
      return res.status(400).json({ error: '缺少 operator' });
    }

    const migration = await migrationService.rejectMigration(req.params.id, operator, reason);
    res.json({ success: true, data: migration });
  } catch (err) {
    console.error('审批拒绝失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reevaluate', async (req, res) => {
  try {
    const { operator, reason } = req.body;
    if (!operator) {
      return res.status(400).json({ error: '缺少 operator' });
    }

    const migration = await migrationService.reevaluateMigration(req.params.id, operator, reason);
    res.json({ success: true, data: migration });
  } catch (err) {
    console.error('重新评估失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/lock-wait', async (req, res) => {
  try {
    const { has_issue, material_id, operator } = req.body;
    if (operator === undefined || has_issue === undefined) {
      return res.status(400).json({ error: '缺少 has_issue 或 operator' });
    }

    const migration = await migrationService.updateLockWaitIssue(
      req.params.id,
      has_issue,
      material_id || null,
      operator
    );

    res.json({ success: true, data: migration });
  } catch (err) {
    console.error('更新锁等待问题失败:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
