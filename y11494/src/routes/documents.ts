import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { runQuery, getOne, getAll } from '../config/database';
import { authenticate, requireRoles, filterFieldsByRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole, DocumentStatus } from '../types';
import {
  generateFileHash,
  ensureDirExists,
  recordChange,
  recordStatusTransition,
  detectDirtyRecord,
  createDirtyRecord,
  validateStatusTransition,
  generateDocumentNo
} from '../utils';

const router = express.Router();

const uploadPath = process.env.UPLOAD_PATH || './uploads';
ensureDirExists(uploadPath);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.body.projectId || 'temp';
    const projectDir = path.join(uploadPath, String(projectId));
    ensureDirExists(projectDir);
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}${ext}`);
  }
});

const upload = multer({ storage });

router.use(authenticate);

router.get('/', auditLog('list', 'document'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { page = 1, pageSize = 10, projectId, documentType, status, isDirty } = req.query;
    let sql = 'SELECT d.*, u.name as creator_name FROM documents d LEFT JOIN users u ON d.created_by = u.id WHERE 1=1';
    const params: any[] = [];
    if (projectId) { sql += ' AND d.project_id = ?'; params.push(projectId); }
    if (documentType) { sql += ' AND d.document_type = ?'; params.push(documentType); }
    if (status) { sql += ' AND d.status = ?'; params.push(status); }
    if (isDirty !== undefined) { sql += ' AND d.is_dirty = ?'; params.push(isDirty === 'true' ? 1 : 0); }
    sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
    const documents = await getAll(sql, params);
    const countSql = 'SELECT COUNT(*) as total FROM documents d WHERE 1=1';
    const countResult = await getOne(countSql);
    const filteredDocs = filterFieldsByRole(documents, user.role);
    res.json({
      data: filteredDocs,
      total: countResult.total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ message: '获取文档列表失败' });
  }
});

router.get('/:id', auditLog('view', 'document'), async (req, res) => {
  try {
    const user = (req as any).user;
    const document = await getOne(
      'SELECT d.*, u.name as creator_name, p.project_no, p.project_name FROM documents d LEFT JOIN users u ON d.created_by = u.id LEFT JOIN projects p ON d.project_id = p.id WHERE d.id = ?',
      [parseInt(req.params.id)]
    );
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    const filteredDoc = filterFieldsByRole(document, user.role);
    res.json({ data: filteredDoc });
  } catch (error) {
    console.error('获取文档详情失败:', error);
    res.status(500).json({ message: '获取文档详情失败' });
  }
});

router.post('/upload', requireRoles(UserRole.MANAGER, UserRole.DATA_ENTRY, UserRole.REVIEWER), upload.single('file'), auditLog('upload', 'document'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { projectId, documentType, title, documentNo, amount, quantity, supplierName, effectiveDate, expiryDate, pageCount } = req.body;
    if (!projectId || !documentType || !title) {
      return res.status(400).json({ message: '项目ID、文档类型和标题不能为空' });
    }
    const project = await getOne('SELECT * FROM projects WHERE id = ?', [parseInt(projectId)]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    if (!req.file) {
      return res.status(400).json({ message: '请选择上传文件' });
    }
    const fileHash = generateFileHash(req.file.path);
    const docNo = documentNo || generateDocumentNo(documentType, project.project_no);
    const result = await runQuery(
      'INSERT INTO documents (project_id, document_type, document_no, version, title, file_name, file_path, file_size, file_hash, amount, quantity, supplier_name, effective_date, expiry_date, page_count, status, is_dirty, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [parseInt(projectId), documentType, docNo, 1, title, req.file.originalname, req.file.path, req.file.size, fileHash, amount || null, quantity || null, supplierName || null, effectiveDate || null, expiryDate || null, pageCount || null, DocumentStatus.DRAFT, 0, user.userId]
    );
    const document = await getOne('SELECT * FROM documents WHERE id = ?', [result.lastID]);
    const dirtyIssues = await detectDirtyRecord(document);
    if (dirtyIssues.length > 0) {
      await runQuery('UPDATE documents SET is_dirty = 1 WHERE id = ?', [result.lastID]);
      for (const issue of dirtyIssues) {
        await createDirtyRecord(result.lastID as number, parseInt(projectId), issue.type, issue.field, undefined, undefined, issue.description);
      }
    }
    res.status(201).json({ data: document, message: '文档上传成功' });
  } catch (error) {
    console.error('文档上传失败:', error);
    res.status(500).json({ message: '文档上传失败' });
  }
});

router.put('/:id', requireRoles(UserRole.MANAGER, UserRole.REVIEWER, UserRole.DATA_ENTRY), auditLog('update', 'document'), async (req, res) => {
  try {
    const user = (req as any).user;
    const documentId = parseInt(req.params.id);
    const document = await getOne('SELECT * FROM documents WHERE id = ?', [documentId]);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    if (document.status === DocumentStatus.FINALIZED || document.status === DocumentStatus.READ_ONLY_AUDIT) {
      return res.status(400).json({ message: '文档已封版，无法修改' });
    }
    const { title, amount, quantity, supplierName, effectiveDate, expiryDate, pageCount, changeReason } = req.body;
    const fieldMap: Record<string, string> = {
      title: 'title',
      amount: 'amount',
      quantity: 'quantity',
      supplierName: 'supplier_name',
      effectiveDate: 'effective_date',
      expiryDate: 'expiry_date',
      pageCount: 'page_count'
    };
    const updates: string[] = [];
    const params: any[] = [];
    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        const oldValue = document[dbField];
        const newValue = req.body[key];
        if (String(oldValue) !== String(newValue)) {
          updates.push(`${dbField} = ?`);
          params.push(newValue);
          await recordChange(documentId, document.project_id, user.userId, user.name, key, String(oldValue || ''), String(newValue || ''), changeReason || '字段更新');
        }
      }
    }
    if (updates.length === 0) {
      return res.json({ data: document, message: '没有需要更新的内容' });
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(documentId);
    await runQuery(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, params);
    const updatedDocument = await getOne('SELECT * FROM documents WHERE id = ?', [documentId]);
    const dirtyIssues = await detectDirtyRecord(updatedDocument);
    const hasDirty = dirtyIssues.length > 0;
    await runQuery('UPDATE documents SET is_dirty = ? WHERE id = ?', [hasDirty ? 1 : 0, documentId]);
    if (hasDirty) {
      for (const issue of dirtyIssues) {
        await createDirtyRecord(documentId, document.project_id, issue.type, issue.field, undefined, undefined, issue.description);
      }
    }
    res.json({ data: updatedDocument, message: '文档更新成功' });
  } catch (error) {
    console.error('更新文档失败:', error);
    res.status(500).json({ message: '更新文档失败' });
  }
});

router.post('/:id/status', requireRoles(UserRole.MANAGER, UserRole.REVIEWER), auditLog('status_change', 'document'), async (req, res) => {
  try {
    const user = (req as any).user;
    const documentId = parseInt(req.params.id);
    const { status, reason } = req.body;
    if (!status || !reason) {
      return res.status(400).json({ message: '状态和原因不能为空' });
    }
    const document = await getOne('SELECT * FROM documents WHERE id = ?', [documentId]);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    if (!validateStatusTransition(document.status as DocumentStatus, status as DocumentStatus, user.role)) {
      return res.status(400).json({ message: '无效的状态变更或权限不足' });
    }
    await recordStatusTransition(documentId, document.project_id, document.status as DocumentStatus, status as DocumentStatus, user.userId, user.name, reason);
    await runQuery('UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, documentId]);
    const updatedDocument = await getOne('SELECT * FROM documents WHERE id = ?', [documentId]);
    res.json({ data: updatedDocument, message: '状态更新成功' });
  } catch (error) {
    console.error('状态更新失败:', error);
    res.status(500).json({ message: '状态更新失败' });
  }
});

router.post('/:id/new-version', requireRoles(UserRole.MANAGER, UserRole.REVIEWER), upload.single('file'), auditLog('new_version', 'document'), async (req, res) => {
  try {
    const user = (req as any).user;
    const documentId = parseInt(req.params.id);
    const { changeReason } = req.body;
    const oldDocument = await getOne('SELECT * FROM documents WHERE id = ?', [documentId]);
    if (!oldDocument) {
      return res.status(404).json({ message: '文档不存在' });
    }
    if (oldDocument.status !== DocumentStatus.REJECTED) {
      return res.status(400).json({ message: '只有被驳回的文档才能创建新版本' });
    }
    if (!req.file) {
      return res.status(400).json({ message: '请选择上传文件' });
    }
    const newVersion = oldDocument.version + 1;
    const fileHash = generateFileHash(req.file.path);
    const result = await runQuery(
      'INSERT INTO documents (project_id, document_type, document_no, version, title, file_name, file_path, file_size, file_hash, amount, quantity, supplier_name, effective_date, expiry_date, page_count, status, is_dirty, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [oldDocument.project_id, oldDocument.document_type, oldDocument.document_no, newVersion, oldDocument.title, req.file.originalname, req.file.path, req.file.size, fileHash, oldDocument.amount, oldDocument.quantity, oldDocument.supplier_name, oldDocument.effective_date, oldDocument.expiry_date, oldDocument.page_count, DocumentStatus.DRAFT, 0, user.userId]
    );
    await recordChange(result.lastID as number, oldDocument.project_id, user.userId, user.name, 'version', String(oldDocument.version), String(newVersion), changeReason || '创建新版本');
    const newDocument = await getOne('SELECT * FROM documents WHERE id = ?', [result.lastID]);
    const dirtyIssues = await detectDirtyRecord(newDocument);
    if (dirtyIssues.length > 0) {
      await runQuery('UPDATE documents SET is_dirty = 1 WHERE id = ?', [result.lastID]);
      for (const issue of dirtyIssues) {
        await createDirtyRecord(result.lastID as number, oldDocument.project_id, issue.type, issue.field, undefined, undefined, issue.description);
      }
    }
    res.status(201).json({ data: newDocument, message: '新版本创建成功' });
  } catch (error) {
    console.error('创建新版本失败:', error);
    res.status(500).json({ message: '创建新版本失败' });
  }
});

router.delete('/:id', requireRoles(UserRole.MANAGER), auditLog('delete', 'document'), async (req, res) => {
  try {
    const document = await getOne('SELECT * FROM documents WHERE id = ?', [parseInt(req.params.id)]);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    if (document.file_path && fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }
    await runQuery('DELETE FROM documents WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: '文档删除成功' });
  } catch (error) {
    console.error('删除文档失败:', error);
    res.status(500).json({ message: '删除文档失败' });
  }
});

router.get('/:id/download', auditLog('download', 'document'), async (req, res) => {
  try {
    const document = await getOne('SELECT * FROM documents WHERE id = ?', [parseInt(req.params.id)]);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    if (!document.file_path || !fs.existsSync(document.file_path)) {
      return res.status(404).json({ message: '文件不存在' });
    }
    res.download(document.file_path, document.file_name);
  } catch (error) {
    console.error('下载文档失败:', error);
    res.status(500).json({ message: '下载文档失败' });
  }
});

router.get('/:id/versions', auditLog('list_versions', 'document'), async (req, res) => {
  try {
    const user = (req as any).user;
    const document = await getOne('SELECT * FROM documents WHERE id = ?', [parseInt(req.params.id)]);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    const versions = await getAll(
      'SELECT d.*, u.name as creator_name FROM documents d LEFT JOIN users u ON d.created_by = u.id WHERE d.document_no = ? AND d.project_id = ? ORDER BY d.version DESC',
      [document.document_no, document.project_id]
    );
    const filteredVersions = filterFieldsByRole(versions, user.role);
    res.json({ data: filteredVersions });
  } catch (error) {
    console.error('获取版本历史失败:', error);
    res.status(500).json({ message: '获取版本历史失败' });
  }
});

export default router;
