import express from 'express';
import { runQuery, getOne, getAll } from '../config/database';
import { authenticate, requireRoles, filterFieldsByRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole } from '../types';

const router = express.Router();

router.use(authenticate);

router.get('/changes', auditLog('list_changes', 'change_record'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { documentId, projectId, page = 1, pageSize = 20 } = req.query;
    let sql = 'SELECT * FROM change_records WHERE 1=1';
    const params: any[] = [];
    if (documentId) { sql += ' AND document_id = ?'; params.push(documentId); }
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId); }
    sql += ' ORDER BY changed_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
    const changes = await getAll(sql, params);
    res.json({
      data: changes,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    console.error('获取变更记录失败:', error);
    res.status(500).json({ message: '获取变更记录失败' });
  }
});

router.get('/changes/:documentId', auditLog('view_changes', 'change_record'), async (req, res) => {
  try {
    const changes = await getAll(
      'SELECT * FROM change_records WHERE document_id = ? ORDER BY changed_at DESC',
      [parseInt(req.params.documentId)]
    );
    res.json({ data: changes });
  } catch (error) {
    console.error('获取文档变更记录失败:', error);
    res.status(500).json({ message: '获取文档变更记录失败' });
  }
});

router.get('/dirty', auditLog('list_dirty', 'dirty_record'), async (req, res) => {
  try {
    const { documentId, projectId, isResolved, page = 1, pageSize = 20 } = req.query;
    let sql = 'SELECT dr.*, d.title as document_title FROM dirty_records dr LEFT JOIN documents d ON dr.document_id = d.id WHERE 1=1';
    const params: any[] = [];
    if (documentId) { sql += ' AND dr.document_id = ?'; params.push(documentId); }
    if (projectId) { sql += ' AND dr.project_id = ?'; params.push(projectId); }
    if (isResolved !== undefined) { sql += ' AND dr.is_resolved = ?'; params.push(isResolved === 'true' ? 1 : 0); }
    sql += ' ORDER BY dr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
    const records = await getAll(sql, params);
    res.json({
      data: records,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    console.error('获取脏记录失败:', error);
    res.status(500).json({ message: '获取脏记录失败' });
  }
});

router.put('/dirty/:id/resolve', requireRoles(UserRole.MANAGER, UserRole.REVIEWER), auditLog('resolve_dirty', 'dirty_record'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { handlingOpinion } = req.body;
    const record = await getOne('SELECT * FROM dirty_records WHERE id = ?', [parseInt(req.params.id)]);
    if (!record) {
      return res.status(404).json({ message: '脏记录不存在' });
    }
    if (record.is_resolved) {
      return res.status(400).json({ message: '该记录已处理' });
    }
    await runQuery(
      'UPDATE dirty_records SET is_resolved = 1, handler_id = ?, handler_name = ?, handling_opinion = ?, handled_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.userId, user.name, handlingOpinion || '', parseInt(req.params.id)]
    );
    const unresolvedCount = await getOne(
      'SELECT COUNT(*) as count FROM dirty_records WHERE document_id = ? AND is_resolved = 0',
      [record.document_id]
    );
    if (unresolvedCount.count === 0) {
      await runQuery('UPDATE documents SET is_dirty = 0 WHERE id = ?', [record.document_id]);
    }
    const updatedRecord = await getOne('SELECT * FROM dirty_records WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ data: updatedRecord, message: '处理成功' });
  } catch (error) {
    console.error('处理脏记录失败:', error);
    res.status(500).json({ message: '处理脏记录失败' });
  }
});

router.get('/status-transitions', auditLog('list_transitions', 'status_transition'), async (req, res) => {
  try {
    const { documentId, projectId, page = 1, pageSize = 20 } = req.query;
    let sql = 'SELECT * FROM status_transitions WHERE 1=1';
    const params: any[] = [];
    if (documentId) { sql += ' AND document_id = ?'; params.push(documentId); }
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId); }
    sql += ' ORDER BY transitioned_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
    const transitions = await getAll(sql, params);
    res.json({
      data: transitions,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    console.error('获取状态流转记录失败:', error);
    res.status(500).json({ message: '获取状态流转记录失败' });
  }
});

router.get('/status-transitions/:documentId', auditLog('view_transitions', 'status_transition'), async (req, res) => {
  try {
    const transitions = await getAll(
      'SELECT * FROM status_transitions WHERE document_id = ? ORDER BY transitioned_at ASC',
      [parseInt(req.params.documentId)]
    );
    res.json({ data: transitions });
  } catch (error) {
    console.error('获取文档状态流转记录失败:', error);
    res.status(500).json({ message: '获取文档状态流转记录失败' });
  }
});

router.get('/audit-logs', requireRoles(UserRole.MANAGER), auditLog('list_audit', 'audit_log'), async (req, res) => {
  try {
    const { userId, action, resourceType, startTime, endTime, page = 1, pageSize = 20 } = req.query;
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    if (action) { sql += ' AND action = ?'; params.push(action); }
    if (resourceType) { sql += ' AND resource_type = ?'; params.push(resourceType); }
    if (startTime) { sql += ' AND created_at >= ?'; params.push(startTime); }
    if (endTime) { sql += ' AND created_at <= ?'; params.push(endTime); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
    const logs = await getAll(sql, params);
    res.json({
      data: logs,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    console.error('获取审计日志失败:', error);
    res.status(500).json({ message: '获取审计日志失败' });
  }
});

router.get('/history/:documentId', auditLog('view_history', 'history'), async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const changes = await getAll(
      'SELECT * FROM change_records WHERE document_id = ? ORDER BY changed_at DESC',
      [documentId]
    );
    const transitions = await getAll(
      'SELECT * FROM status_transitions WHERE document_id = ? ORDER BY transitioned_at DESC',
      [documentId]
    );
    const versions = await getAll(
      'SELECT id, version, title, status, created_at, created_by FROM documents WHERE document_no = (SELECT document_no FROM documents WHERE id = ?) ORDER BY version DESC',
      [documentId]
    );
    const allHistory = [
      ...changes.map(c => ({ type: 'change', ...c, timestamp: c.changed_at })),
      ...transitions.map(t => ({ type: 'status', ...t, timestamp: t.transitioned_at })),
      ...versions.map(v => ({ type: 'version', ...v, timestamp: v.created_at }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({
      data: {
        timeline: allHistory,
        changes,
        transitions,
        versions
      }
    });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ message: '获取历史记录失败' });
  }
});

export default router;
