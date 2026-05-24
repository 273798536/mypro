const express = require('express');
const db = require('../database/connection');
const config = require('../config');
const { authenticate, requireRole } = require('../middleware/auth');
const { filterFieldsByPermission, canEditRecord } = require('../middleware/permission');
const { logAction } = require('../services/auditService');
const { recordWorkFlow, getWorkflowHistory, canPerformAction, getNextStatus } = require('../services/workflowService');
const { processBatchRecords, getBatchInfo, getBatchRecords, updateRecord } = require('../services/batchService');
const { analyzeDirtyRecord, resolveDirtyRecord } = require('../services/dataQualityService');
const { exportToExcel, generateExportFileName, getExportSummary } = require('../services/exportService');

const createBaseRouter = (moduleName, tableName, idField = 'id') => {
  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const { 
        page = 1, 
        pageSize = 20, 
        status, 
        branch, 
        is_dirty, 
        startDate, 
        endDate,
        batch_no 
      } = req.query;
      
      let whereClause = [];
      let params = [];
      
      if (status) {
        whereClause.push('status = ?');
        params.push(status);
      }
      if (branch) {
        whereClause.push('branch = ?');
        params.push(branch);
      }
      if (is_dirty !== undefined) {
        whereClause.push('is_dirty = ?');
        params.push(is_dirty);
      }
      if (batch_no) {
        whereClause.push('batch_no = ?');
        params.push(batch_no);
      }
      
      const where = whereClause.length ? `WHERE ${whereClause.join(' AND ')}` : '';
      const offset = (page - 1) * pageSize;
      
      db.all(`
        SELECT * FROM ${tableName} 
        ${where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(pageSize), offset], async (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const filteredData = await filterFieldsByPermission(rows, req.user.role, tableName, 'view');
        
        db.get(`SELECT COUNT(*) as total FROM ${tableName} ${where}`, params, (err, countResult) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({
            data: filteredData,
            pagination: {
              page: parseInt(page),
              pageSize: parseInt(pageSize),
              total: countResult.total
            }
          });
        });
      });
      
      await logAction(req.user, 'list', moduleName, null, req.ip, req.get('User-Agent'), req.query);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id', authenticate, async (req, res) => {
    try {
      db.get(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [req.params.id], async (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!row) {
          return res.status(404).json({ error: '记录不存在' });
        }
        
        const filteredData = await filterFieldsByPermission(row, req.user.role, tableName, 'view');
        res.json(filteredData);
        
        await logAction(req.user, 'view', moduleName, req.params.id, req.ip, req.get('User-Agent'));
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/', authenticate, requireRole(config.ROLES.DATA_ENTRY, config.ROLES.SUPERVISOR), async (req, res) => {
    try {
      const data = req.body;
      data.status = config.RECORD_STATUS.DRAFT;
      data.created_by = req.user.id;
      data.updated_by = req.user.id;
      data.original_data = JSON.stringify(data);
      
      const dirtyAnalysis = analyzeDirtyRecord(data, null, tableName);
      data.is_dirty = dirtyAnalysis.isDirty ? 1 : 0;
      data.dirty_type = dirtyAnalysis.dirtyType;
      data.dirty_details = dirtyAnalysis.dirtyDetails;
      
      const columns = Object.keys(data);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => data[col]);
      
      db.run(`
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
      `, values, async function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        await recordWorkFlow(
          tableName,
          this.lastID,
          'create_draft',
          null,
          config.RECORD_STATUS.DRAFT,
          req.user,
          '创建草稿'
        );
        
        await logAction(req.user, 'create', moduleName, this.lastID, req.ip, req.get('User-Agent'), data);
        
        res.json({ id: this.lastID, message: '创建成功' });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/:id', authenticate, requireRole(config.ROLES.DATA_ENTRY, config.ROLES.REVIEWER, config.ROLES.SUPERVISOR), async (req, res) => {
    try {
      db.get(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [req.params.id], async (err, record) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!record) {
          return res.status(404).json({ error: '记录不存在' });
        }
        
        if (!canEditRecord(req.user.role, record.status)) {
          return res.status(403).json({ error: '当前状态下无权修改此记录' });
        }
        
        const data = req.body;
        data.updated_by = req.user.id;
        
        const changeDetails = {};
        Object.keys(data).forEach(key => {
          if (record[key] !== data[key]) {
            changeDetails[key] = { old: record[key], new: data[key] };
          }
        });
        
        const columns = Object.keys(data).filter(col => col !== idField && col !== 'created_by' && col !== 'created_at');
        const setClause = columns.map(col => `${col} = ?`).join(', ');
        const values = [...columns.map(col => data[col]), req.user.id, req.params.id];
        
        db.run(`
          UPDATE ${tableName}
          SET ${setClause}, updated_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE ${idField} = ?
        `, values, async function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          await recordWorkFlow(
            tableName,
            req.params.id,
            'update',
            record.status,
            record.status,
            req.user,
            '更新记录',
            changeDetails
          );
          
          await logAction(req.user, 'update', moduleName, req.params.id, req.ip, req.get('User-Agent'), data);
          
          res.json({ changes: this.changes, message: '更新成功' });
        });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/batch', authenticate, requireRole(config.ROLES.DATA_ENTRY, config.ROLES.SUPERVISOR), async (req, res) => {
    try {
      const { records, duplicateStrategy } = req.body;
      
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: '请提供有效的记录数组' });
      }
      
      const result = await processBatchRecords(
        tableName, 
        records, 
        req.user, 
        duplicateStrategy || config.DUPLICATE_STRATEGY.IGNORE
      );
      
      await logAction(req.user, 'batch_import', moduleName, null, req.ip, req.get('User-Agent'), {
        count: records.length,
        duplicateStrategy
      });
      
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:id/action', authenticate, async (req, res) => {
    try {
      const { action, reason } = req.body;
      
      db.get(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [req.params.id], async (err, record) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!record) {
          return res.status(404).json({ error: '记录不存在' });
        }
        
        if (!canPerformAction(req.user.role, record.status, action)) {
          return res.status(403).json({ error: '无权执行此操作' });
        }
        
        const nextStatus = getNextStatus(action);
        if (!nextStatus) {
          return res.status(400).json({ error: '无效的操作' });
        }
        
        db.run(`
          UPDATE ${tableName}
          SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE ${idField} = ?
        `, [nextStatus, req.user.id, req.params.id], async function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          await recordWorkFlow(
            tableName,
            req.params.id,
            action,
            record.status,
            nextStatus,
            req.user,
            reason
          );
          
          await logAction(req.user, action, moduleName, req.params.id, req.ip, req.get('User-Agent'), { reason });
          
          res.json({ 
            message: '操作成功', 
            fromStatus: record.status, 
            toStatus: nextStatus 
          });
        });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id/history', authenticate, async (req, res) => {
    try {
      const history = await getWorkflowHistory(tableName, req.params.id);
      
      await logAction(req.user, 'view_history', moduleName, req.params.id, req.ip, req.get('User-Agent'));
      
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/dirty/list', authenticate, requireRole(config.ROLES.REVIEWER, config.ROLES.SUPERVISOR), async (req, res) => {
    try {
      const { dirtyType, branch, batchNo } = req.query;
      
      let whereClause = ['is_dirty = 1'];
      let params = [];
      
      if (dirtyType) {
        whereClause.push('dirty_type = ?');
        params.push(dirtyType);
      }
      if (branch) {
        whereClause.push('branch = ?');
        params.push(branch);
      }
      if (batchNo) {
        whereClause.push('batch_no = ?');
        params.push(batchNo);
      }
      
      const where = whereClause.join(' AND ');
      
      db.all(`
        SELECT * FROM ${tableName} 
        WHERE ${where}
        ORDER BY created_at DESC
      `, params, (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(rows);
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:id/resolve-dirty', authenticate, requireRole(config.ROLES.REVIEWER, config.ROLES.SUPERVISOR), async (req, res) => {
    try {
      const { processingOpinion } = req.body;
      
      const changes = await resolveDirtyRecord(db, tableName, req.params.id, processingOpinion, req.user);
      
      await recordWorkFlow(
        tableName,
        req.params.id,
        'resolve_dirty',
        null,
        null,
        req.user,
        processingOpinion
      );
      
      await logAction(req.user, 'resolve_dirty', moduleName, req.params.id, req.ip, req.get('User-Agent'), { processingOpinion });
      
      res.json({ changes, message: '脏记录已处理' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/batch/:batchNo/info', authenticate, async (req, res) => {
    try {
      const batchInfo = await getBatchInfo(req.params.batchNo);
      if (!batchInfo) {
        return res.status(404).json({ error: '批次不存在' });
      }
      res.json(batchInfo);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/batch/:batchNo/records', authenticate, async (req, res) => {
    try {
      const records = await getBatchRecords(tableName, req.params.batchNo);
      res.json(records);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/export', authenticate, async (req, res) => {
    try {
      const { filters = {}, maskSensitive = true, headers = [] } = req.body;
      
      let whereClause = [];
      let params = [];
      
      if (filters.status) {
        whereClause.push('status = ?');
        params.push(filters.status);
      }
      if (filters.branch) {
        whereClause.push('branch = ?');
        params.push(filters.branch);
      }
      if (filters.startDate) {
        whereClause.push('created_at >= ?');
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.push('created_at <= ?');
        params.push(filters.endDate);
      }
      
      const where = whereClause.length ? `WHERE ${whereClause.join(' AND ')}` : '';
      
      db.all(`SELECT * FROM ${tableName} ${where} ORDER BY created_at DESC`, params, async (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const summary = getExportSummary(rows, tableName);
        const buffer = await exportToExcel(rows, {
          sheetName: moduleName,
          headers,
          maskSensitive
        });
        
        const fileName = generateExportFileName(moduleName);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        await logAction(req.user, 'export', moduleName, null, req.ip, req.get('User-Agent'), filters);
        
        res.send(buffer);
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/stats/summary', authenticate, async (req, res) => {
    try {
      db.all(`
        SELECT 
          status,
          COUNT(*) as count
        FROM ${tableName}
        GROUP BY status
      `, [], (err, statusStats) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        db.get(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_dirty = 1 THEN 1 ELSE 0 END) as dirty_count
          FROM ${tableName}
        `, [], (err, totals) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({
            status: statusStats,
            totals
          });
        });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = createBaseRouter;
