const express = require('express');
const fs = require('fs');
const exportService = require('../services/exportService');
const logger = require('../config/logger');
const { ROLES } = require('../config/constants');

const router = express.Router();

const CAN_EXPORT_SENSITIVE = [ROLES.ADMIN, ROLES.AUDITOR];

router.post('/lost-items', async (req, res) => {
  try {
    const { taskName, requestedBy, filters, role = 'viewer' } = req.body;

    const canAccessSensitive = CAN_EXPORT_SENSITIVE.includes(role);
    const includeSensitive = canAccessSensitive && req.body.includeSensitive === true;

    if (req.body.includeSensitive && !canAccessSensitive) {
      logger.warn('敏感数据导出权限被拒绝', { role, requestedBy });
    }

    await exportService.freezeBeforeExport('lost-items', requestedBy, role);

    const taskId = await exportService.createExportTask(
      taskName || '遗失物品报告',
      'lost-items',
      requestedBy,
      filters,
      includeSensitive
    );

    const result = await exportService.exportLostItemsReport(taskId, role, includeSensitive);

    res.json({
      success: true,
      data: {
        taskId,
        ...result,
        sensitive_included: includeSensitive
      }
    });
  } catch (error) {
    logger.error('导出失败', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const db = require('../config/database');
    db.all('SELECT * FROM export_tasks ORDER BY created_at DESC LIMIT 50', (err, tasks) => {
      if (err) throw err;
      res.json({ success: true, data: tasks });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const db = require('../config/database');
    db.get('SELECT * FROM export_tasks WHERE id = ?', [req.params.id], (err, task) => {
      if (err) throw err;
      if (!task) {
        return res.status(404).json({ success: false, error: '任务不存在' });
      }
      res.json({ success: true, data: task });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/download/:id', async (req, res) => {
  try {
    const db = require('../config/database');
    db.get('SELECT * FROM export_tasks WHERE id = ?', [req.params.id], (err, task) => {
      if (err) throw err;
      
      if (!task || !task.file_path) {
        return res.status(404).json({ success: false, error: '文件不存在' });
      }

      if (!fs.existsSync(task.file_path)) {
        return res.status(404).json({ success: false, error: '文件已被删除' });
      }

      res.download(task.file_path, task.task_name + '.csv');
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/role-view/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const { department } = req.query;
    const data = await exportService.getRoleViewData(role, department);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('获取角色视图失败', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
