import express from 'express';
import { runQuery, getOne, getAll } from '../config/database';
import { authenticate, requireRoles, filterFieldsByRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole } from '../types';

const router = express.Router();

router.use(authenticate);

router.get('/', auditLog('list', 'project'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { page = 1, pageSize = 10, status, keyword } = req.query;
    let sql = 'SELECT p.*, u.name as project_manager_name FROM projects p LEFT JOIN users u ON p.project_manager_id = u.id WHERE 1=1';
    const params: any[] = [];
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (keyword) {
      sql += ' AND (p.project_name LIKE ? OR p.project_no LIKE ? OR p.client_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
    const projects = await getAll(sql, params);
    const countSql = 'SELECT COUNT(*) as total FROM projects p WHERE 1=1';
    const countResult = await getOne(countSql);
    const filteredProjects = filterFieldsByRole(projects, user.role);
    res.json({
      data: filteredProjects,
      total: countResult.total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ message: '获取项目列表失败' });
  }
});

router.get('/:id', auditLog('view', 'project'), async (req, res) => {
  try {
    const user = (req as any).user;
    const project = await getOne(
      'SELECT p.*, u.name as project_manager_name FROM projects p LEFT JOIN users u ON p.project_manager_id = u.id WHERE p.id = ?',
      [parseInt(req.params.id)]
    );
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    const filteredProject = filterFieldsByRole(project, user.role);
    res.json({ data: filteredProject });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({ message: '获取项目详情失败' });
  }
});

router.post('/', requireRoles(UserRole.MANAGER, UserRole.DATA_ENTRY), auditLog('create', 'project'), async (req, res) => {
  try {
    const { projectNo, projectName, clientName, bidDeadline, projectManagerId } = req.body;
    if (!projectNo || !projectName) {
      return res.status(400).json({ message: '项目编号和名称不能为空' });
    }
    const existing = await getOne('SELECT id FROM projects WHERE project_no = ?', [projectNo]);
    if (existing) {
      return res.status(400).json({ message: '项目编号已存在' });
    }
    const result = await runQuery(
      'INSERT INTO projects (project_no, project_name, client_name, bid_deadline, project_manager_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [projectNo, projectName, clientName || null, bidDeadline || null, projectManagerId || null, 'draft']
    );
    const project = await getOne('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    res.status(201).json({ data: project, message: '项目创建成功' });
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({ message: '创建项目失败' });
  }
});

router.put('/:id', requireRoles(UserRole.MANAGER, UserRole.REVIEWER), auditLog('update', 'project'), async (req, res) => {
  try {
    const { projectName, clientName, bidDeadline, projectManagerId, status } = req.body;
    const project = await getOne('SELECT * FROM projects WHERE id = ?', [parseInt(req.params.id)]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    const updates: string[] = [];
    const params: any[] = [];
    if (projectName !== undefined) { updates.push('project_name = ?'); params.push(projectName); }
    if (clientName !== undefined) { updates.push('client_name = ?'); params.push(clientName); }
    if (bidDeadline !== undefined) { updates.push('bid_deadline = ?'); params.push(bidDeadline); }
    if (projectManagerId !== undefined) { updates.push('project_manager_id = ?'); params.push(projectManagerId); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(parseInt(req.params.id));
    await runQuery(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
    const updatedProject = await getOne('SELECT * FROM projects WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ data: updatedProject, message: '项目更新成功' });
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ message: '更新项目失败' });
  }
});

router.delete('/:id', requireRoles(UserRole.MANAGER), auditLog('delete', 'project'), async (req, res) => {
  try {
    const project = await getOne('SELECT * FROM projects WHERE id = ?', [parseInt(req.params.id)]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    await runQuery('DELETE FROM projects WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: '项目删除成功' });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ message: '删除项目失败' });
  }
});

router.get('/:id/documents', auditLog('list_documents', 'project'), async (req, res) => {
  try {
    const user = (req as any).user;
    const documents = await getAll(
      'SELECT d.*, u.name as creator_name FROM documents d LEFT JOIN users u ON d.created_by = u.id WHERE d.project_id = ? ORDER BY d.created_at DESC',
      [parseInt(req.params.id)]
    );
    const filteredDocs = filterFieldsByRole(documents, user.role);
    res.json({ data: filteredDocs });
  } catch (error) {
    console.error('获取项目文档失败:', error);
    res.status(500).json({ message: '获取项目文档失败' });
  }
});

export default router;
