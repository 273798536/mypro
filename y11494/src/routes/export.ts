import express from 'express';
import ExcelJS from 'exceljs';
import { getAll, getOne, runQuery } from '../config/database';
import { authenticate, requireRoles, filterFieldsByRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole } from '../types';
import { maskSensitiveFields, generateFileHash } from '../utils';

const router = express.Router();

router.use(authenticate);

router.get('/project/:projectId/excel', requireRoles(UserRole.MANAGER, UserRole.REVIEWER), auditLog('export_excel', 'export'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { desensitized = 'false' } = req.query;
    const isDesensitized = desensitized === 'true';
    const projectId = parseInt(req.params.projectId);
    const project = await getOne('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    const documents = await getAll(
      'SELECT d.*, u.name as creator_name FROM documents d LEFT JOIN users u ON d.created_by = u.id WHERE d.project_id = ? ORDER BY d.document_type, d.version DESC',
      [projectId]
    );
    const transitions = await getAll(
      'SELECT * FROM status_transitions WHERE project_id = ? ORDER BY transitioned_at ASC',
      [projectId]
    );
    const changes = await getAll(
      'SELECT * FROM change_records WHERE project_id = ? ORDER BY changed_at ASC',
      [projectId]
    );
    const dirtyRecords = await getAll(
      'SELECT * FROM dirty_records WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    const workbook = new ExcelJS.Workbook();
    workbook.creator = user.name;
    workbook.created = new Date();
    const projectSheet = workbook.addWorksheet('项目信息');
    projectSheet.columns = [
      { header: '项目编号', key: 'projectNo', width: 20 },
      { header: '项目名称', key: 'projectName', width: 30 },
      { header: '客户名称', key: 'clientName', width: 20 },
      { header: '投标截止日期', key: 'bidDeadline', width: 20 },
      { header: '项目状态', key: 'status', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];
    projectSheet.addRow({
      projectNo: project.project_no,
      projectName: project.project_name,
      clientName: project.client_name,
      bidDeadline: project.bid_deadline,
      status: project.status,
      createdAt: project.created_at
    });
    const docSheet = workbook.addWorksheet('文档列表');
    docSheet.columns = [
      { header: '文档类型', key: 'documentType', width: 15 },
      { header: '文档编号', key: 'documentNo', width: 25 },
      { header: '版本', key: 'version', width: 8 },
      { header: '标题', key: 'title', width: 30 },
      { header: '金额', key: 'amount', width: 15 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '供应商', key: 'supplierName', width: 20 },
      { header: '状态', key: 'status', width: 15 },
      { header: '是否异常', key: 'isDirty', width: 10 },
      { header: '创建人', key: 'creatorName', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];
    documents.forEach((doc: any) => {
      let rowData = {
        documentType: doc.document_type,
        documentNo: doc.document_no,
        version: doc.version,
        title: doc.title,
        amount: isDesensitized ? '***' : doc.amount,
        quantity: doc.quantity,
        supplierName: isDesensitized ? '***' : doc.supplier_name,
        status: doc.status,
        isDirty: doc.is_dirty ? '是' : '否',
        creatorName: doc.creator_name,
        createdAt: doc.created_at
      };
      docSheet.addRow(rowData);
    });
    const transitionSheet = workbook.addWorksheet('状态流转');
    transitionSheet.columns = [
      { header: '文档编号', key: 'documentId', width: 12 },
      { header: '原状态', key: 'fromStatus', width: 15 },
      { header: '新状态', key: 'toStatus', width: 15 },
      { header: '操作人', key: 'operatorName', width: 15 },
      { header: '原因', key: 'reason', width: 30 },
      { header: '时间', key: 'transitionedAt', width: 20 }
    ];
    transitions.forEach((t: any) => {
      transitionSheet.addRow({
        documentId: t.document_id,
        fromStatus: t.from_status,
        toStatus: t.to_status,
        operatorName: t.operator_name,
        reason: t.reason,
        transitionedAt: t.transitioned_at
      });
    });
    const changeSheet = workbook.addWorksheet('变更记录');
    changeSheet.columns = [
      { header: '文档ID', key: 'documentId', width: 10 },
      { header: '字段', key: 'fieldName', width: 15 },
      { header: '原值', key: 'oldValue', width: 25 },
      { header: '新值', key: 'newValue', width: 25 },
      { header: '变更原因', key: 'changeReason', width: 30 },
      { header: '操作人', key: 'operatorName', width: 15 },
      { header: '时间', key: 'changedAt', width: 20 }
    ];
    changes.forEach((c: any) => {
      changeSheet.addRow({
        documentId: c.document_id,
        fieldName: c.field_name,
        oldValue: c.old_value,
        newValue: c.new_value,
        changeReason: c.change_reason,
        operatorName: c.operator_name,
        changedAt: c.changed_at
      });
    });
    const dirtySheet = workbook.addWorksheet('异常记录');
    dirtySheet.columns = [
      { header: '文档ID', key: 'documentId', width: 10 },
      { header: '异常类型', key: 'dirtyType', width: 15 },
      { header: '字段', key: 'fieldName', width: 15 },
      { header: '描述', key: 'description', width: 30 },
      { header: '处理人', key: 'handlerName', width: 15 },
      { header: '处理意见', key: 'handlingOpinion', width: 25 },
      { header: '是否解决', key: 'isResolved', width: 10 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];
    dirtyRecords.forEach((d: any) => {
      dirtySheet.addRow({
        documentId: d.document_id,
        dirtyType: d.dirty_type,
        fieldName: d.field_name,
        description: d.description,
        handlerName: d.handler_name,
        handlingOpinion: d.handling_opinion,
        isResolved: d.is_resolved ? '是' : '否',
        createdAt: d.created_at
      });
    });
    const fileName = `${project.project_no}_投标资料_${new Date().toISOString().split('T')[0]}${isDesensitized ? '_脱敏' : ''}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    const documentIds = documents.map((d: any) => d.id).join(',');
    await runQuery(
      'INSERT INTO export_records (project_id, exported_by, exporter_name, export_type, is_desensitized, document_ids) VALUES (?, ?, ?, ?, ?, ?)',
      [projectId, user.userId, user.name, 'excel', isDesensitized ? 1 : 0, documentIds]
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('导出Excel失败:', error);
    res.status(500).json({ message: '导出Excel失败' });
  }
});

router.get('/role-view', auditLog('role_view', 'dashboard'), async (req, res) => {
  try {
    const user = (req as any).user;
    const projectStats = await getOne('SELECT COUNT(*) as total, SUM(CASE WHEN status = "finalized" THEN 1 ELSE 0 END) as finalized, SUM(CASE WHEN is_dirty = 1 THEN 1 ELSE 0 END) as has_issues FROM documents');
    const recentChanges = await getAll(
      'SELECT cr.*, d.title as document_title FROM change_records cr LEFT JOIN documents d ON cr.document_id = d.id ORDER BY cr.changed_at DESC LIMIT 10'
    );
    const pendingDocuments = await getAll(
      'SELECT d.*, p.project_name, u.name as creator_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id LEFT JOIN users u ON d.created_by = u.id WHERE d.status NOT IN ("finalized", "read_only_audit") ORDER BY d.updated_at DESC LIMIT 10'
    );
    const dirtyRecords = await getAll(
      'SELECT dr.*, d.title as document_title FROM dirty_records dr LEFT JOIN documents d ON dr.document_id = d.id WHERE dr.is_resolved = 0 ORDER BY dr.created_at DESC LIMIT 10'
    );
    const roleData = {
      user,
      statistics: {
        totalDocuments: projectStats?.total || 0,
        finalizedDocuments: projectStats?.finalized || 0,
        documentsWithIssues: projectStats?.has_issues || 0
      },
      recentChanges: filterFieldsByRole(recentChanges, user.role),
      pendingDocuments: filterFieldsByRole(pendingDocuments, user.role),
      unresolvedDirtyRecords: dirtyRecords
    };
    res.json({ data: roleData });
  } catch (error) {
    console.error('获取角色视图失败:', error);
    res.status(500).json({ message: '获取角色视图失败' });
  }
});

router.get('/export-records', requireRoles(UserRole.MANAGER), auditLog('list_exports', 'export'), async (req, res) => {
  try {
    const { projectId, page = 1, pageSize = 20 } = req.query;
    let sql = 'SELECT er.*, p.project_name FROM export_records er LEFT JOIN projects p ON er.project_id = p.id WHERE 1=1';
    const params: any[] = [];
    if (projectId) { sql += ' AND er.project_id = ?'; params.push(projectId); }
    sql += ' ORDER BY er.exported_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
    const records = await getAll(sql, params);
    res.json({
      data: records,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    console.error('获取导出记录失败:', error);
    res.status(500).json({ message: '获取导出记录失败' });
  }
});

export default router;
