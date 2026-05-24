import { Response } from 'express';
import { SigninRecord, CompensationQueue, FailedRecord } from '../models';
import { QueueStatus, UserRole } from '../models/types';
import { AuthRequest } from '../middleware/auth';
import { getAuditLogs } from '../services/auditService';
import { filterFieldsByRole, hrbpFocusFields } from '../config/permissions';
import { Op, fn, col, literal } from 'sequelize';
import ExcelJS from 'exceljs';

export async function getSigninReport(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const {
      startDate,
      endDate,
      department,
      trainingId,
      source,
      page = 1,
      pageSize = 50
    } = req.query;
    
    const where: any = {
      isValid: true
    };
    
    if (startDate && endDate) {
      where.trainingDate = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    }
    if (department) where.department = department;
    if (trainingId) where.trainingId = trainingId;
    if (source) where.source = source;
    
    const { count, rows } = await SigninRecord.findAndCountAll({
      where,
      order: [['trainingDate', 'DESC'], ['signinTime', 'DESC']],
      limit: parseInt(pageSize as string),
      offset: (parseInt(page as string) - 1) * parseInt(pageSize as string)
    });
    
    const filteredRows = rows.map(row => filterFieldsByRole(row.toJSON(), user.role));
    
    res.json({
      success: true,
      total: count,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      data: filteredRows
    });
  } catch (error: any) {
    console.error('获取签到报表错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getFailedRecords(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const {
      source,
      retryCategory,
      isResolved,
      startDate,
      endDate,
      page = 1,
      pageSize = 50
    } = req.query;
    
    const where: any = {};
    
    if (source) where.source = source;
    if (retryCategory) where.retryCategory = retryCategory;
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    }
    
    const { count, rows } = await FailedRecord.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize as string),
      offset: (parseInt(page as string) - 1) * parseInt(pageSize as string)
    });
    
    res.json({
      success: true,
      total: count,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      data: rows
    });
  } catch (error: any) {
    console.error('获取失败记录错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getHrbpDashboard(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    
    const queueStats = await CompensationQueue.findAll({
      attributes: [
        'retryCategory',
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        status: {
          [Op.in]: [
            QueueStatus.PENDING,
            QueueStatus.PROCESSING,
            QueueStatus.RETRYING,
            QueueStatus.DEAD_LETTER,
            QueueStatus.MANUAL_REVIEW
          ]
        }
      },
      group: ['retryCategory', 'status'],
      order: [['retryCategory', 'ASC']]
    });
    
    const statusBreakdown = await CompensationQueue.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['status']
    });
    
    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const dailyTrend = await CompensationQueue.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: last7Days
        }
      },
      group: [fn('DATE', col('created_at')), 'status'],
      order: [[fn('DATE', col('created_at')), 'DESC']]
    });
    
    const recentDeadLetters = await CompensationQueue.findAll({
      where: { status: QueueStatus.DEAD_LETTER },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    const recentManualReviews = await CompensationQueue.findAll({
      where: { status: QueueStatus.MANUAL_REVIEW },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    res.json({
      success: true,
      focusFields: hrbpFocusFields,
      data: {
        byCategoryAndStatus: queueStats.map(s => ({
          retryCategory: s.retryCategory,
          status: s.status,
          count: parseInt((s as any).getDataValue('count'))
        })),
        statusBreakdown: statusBreakdown.map(s => ({
          status: s.status,
          count: parseInt((s as any).getDataValue('count'))
        })),
        dailyTrend: dailyTrend.map(t => ({
          date: (t as any).getDataValue('date'),
          status: t.status,
          count: parseInt((t as any).getDataValue('count'))
        })),
        recentDeadLetters: recentDeadLetters.map(r => filterFieldsByRole(r.toJSON(), user.role)),
        recentManualReviews: recentManualReviews.map(r => filterFieldsByRole(r.toJSON(), user.role))
      }
    });
  } catch (error: any) {
    console.error('获取HRBP仪表盘错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function exportSigninReport(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { startDate, endDate, department, trainingId, source } = req.query;
    
    const where: any = { isValid: true };
    if (startDate && endDate) {
      where.trainingDate = { [Op.between]: [new Date(startDate as string), new Date(endDate as string)] };
    }
    if (department) where.department = department;
    if (trainingId) where.trainingId = trainingId;
    if (source) where.source = source;
    
    const records = await SigninRecord.findAll({
      where,
      order: [['trainingDate', 'DESC'], ['signinTime', 'DESC']]
    });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('签到报表');
    
    worksheet.columns = [
      { header: '签到编号', key: 'signinNo', width: 20 },
      { header: '员工ID', key: 'employeeId', width: 15 },
      { header: '员工姓名', key: 'employeeName', width: 15 },
      { header: '部门', key: 'department', width: 20 },
      { header: '培训ID', key: 'trainingId', width: 15 },
      { header: '培训名称', key: 'trainingName', width: 30 },
      { header: '培训日期', key: 'trainingDate', width: 12 },
      { header: '签到时间', key: 'signinTime', width: 20 },
      { header: '签到类型', key: 'signinType', width: 12 },
      { header: '数据来源', key: 'source', width: 15 },
      { header: '是否代签', key: 'isProxy', width: 10 },
      { header: '是否补偿', key: 'isCompensated', width: 12 },
      { header: '是否有效', key: 'isValid', width: 10 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];
    
    records.forEach(record => {
      worksheet.addRow({
        signinNo: record.signinNo,
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department,
        trainingId: record.trainingId,
        trainingName: record.trainingName,
        trainingDate: record.trainingDate,
        signinTime: record.signinTime,
        signinType: record.signinType,
        source: record.source,
        isProxy: record.isProxy ? '是' : '否',
        isCompensated: record.isCompensated ? '是' : '否',
        isValid: record.isValid ? '是' : '否',
        createdAt: record.createdAt
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=signin-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('导出签到报表错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function exportFailedRecords(req: AuthRequest, res: Response) {
  try {
    const { source, retryCategory, isResolved, startDate, endDate } = req.query;
    
    const where: any = {};
    if (source) where.source = source;
    if (retryCategory) where.retryCategory = retryCategory;
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate as string), new Date(endDate as string)] };
    }
    
    const records = await FailedRecord.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('失败记录');
    
    worksheet.columns = [
      { header: '失败编号', key: 'failureNo', width: 20 },
      { header: '数据来源', key: 'source', width: 15 },
      { header: '记录类型', key: 'recordType', width: 15 },
      { header: '错误分类', key: 'retryCategory', width: 20 },
      { header: '错误信息', key: 'errorMessage', width: 40 },
      { header: '原始数据', key: 'originalData', width: 50 },
      { header: '是否已解决', key: 'isResolved', width: 12 },
      { header: '解决方式', key: 'resolutionMethod', width: 20 },
      { header: '解决备注', key: 'resolutionRemark', width: 40 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];
    
    records.forEach(record => {
      worksheet.addRow({
        failureNo: record.failureNo,
        source: record.source,
        recordType: record.recordType,
        retryCategory: record.retryCategory,
        errorMessage: record.errorMessage,
        originalData: JSON.stringify(record.originalData).substring(0, 100),
        isResolved: record.isResolved ? '是' : '否',
        resolutionMethod: record.resolutionMethod || '',
        resolutionRemark: record.resolutionRemark || '',
        createdAt: record.createdAt
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=failed-records-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('导出失败记录错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getRecordDiff(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { recordType, recordId } = req.params;
    
    const auditLogs = await getAuditLogs({
      recordId: parseInt(recordId),
      startTime: new Date(0)
    });
    
    const beforeAfterPairs = auditLogs
      .filter(log => log.beforeData || log.afterData)
      .map(log => ({
        logId: log.id,
        action: log.action,
        operator: log.operatorName,
        changeReason: log.changeReason,
        beforeData: log.beforeData,
        afterData: log.afterData,
        createdAt: log.createdAt
      }));
    
    res.json({
      success: true,
      data: beforeAfterPairs
    });
  } catch (error: any) {
    console.error('获取记录差异错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
