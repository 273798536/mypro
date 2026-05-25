import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import { getDatabase } from '../db/database';
import { AuditReport, DirtyType, User } from '../types';

export class ReportGenerator {
  private db = getDatabase();
  
  generateReport(batchId: string, generatedBy: User): AuditReport {
    const batch = this.db.getBatch(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }
    
    const checkinRecords = this.db.getCheckinRecords(batchId);
    const depositRecords = this.db.getDepositRecords(batchId);
    const roomChangeRecords = this.db.getRoomChangeRecords(batchId);
    const shiftRecords = this.db.getShiftRecords(batchId);
    const supplementRecords = this.db.getSupplementRecords(batchId);
    
    const actualTotalRecords = 
      checkinRecords.length + 
      depositRecords.length + 
      roomChangeRecords.length + 
      shiftRecords.length + 
      supplementRecords.length;
    
    const dirtyRecords = this.db.getDirtyRecords(batchId);
    const statusChanges = this.db.getStatusChanges(undefined, batchId);
    
    const summary = {
      totalRecords: actualTotalRecords,
      cleanRecords: actualTotalRecords - dirtyRecords.filter(d => d.status === 'pending').length,
      dirtyRecords: dirtyRecords.length,
      fixedRecords: dirtyRecords.filter(d => d.status === 'fixed').length,
      pendingRecords: dirtyRecords.filter(d => d.status === 'pending').length,
      crossDayIssues: dirtyRecords.filter(d => d.dirtyType === 'cross_day').length,
      amountConflicts: dirtyRecords.filter(d => d.dirtyType === 'amount_conflict').length,
      nameChanges: dirtyRecords.filter(d => d.dirtyType === 'name_changed').length,
      missingFields: dirtyRecords.filter(d => d.dirtyType === 'missing_field').length
    };
    
    const report: Omit<AuditReport, 'id'> = {
      batchNo: batch.batchNo,
      reportDate: new Date().toISOString().split('T')[0],
      generatedBy: generatedBy.name,
      generatedAt: new Date().toISOString(),
      summary,
      dirtyRecords,
      statusChanges,
      exportReady: summary.pendingRecords === 0
    };
    
    return this.db.addAuditReport(report);
  }
  
  exportToCSV(batchId: string, outputDir: string): { files: string[] } {
    const batch = this.db.getBatch(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }
    
    const files: string[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const dirtyRecords = this.db.getDirtyRecords(batchId);
    if (dirtyRecords.length > 0) {
      const dirtyCsv = this.exportDirtyRecordsToCSV(dirtyRecords);
      const dirtyPath = path.join(outputDir, `${batch.batchNo}_脏记录_${timestamp}.csv`);
      fs.writeFileSync(dirtyPath, dirtyCsv, 'utf-8');
      files.push(dirtyPath);
    }
    
    const failedRecords = dirtyRecords.filter(d => d.status === 'pending');
    if (failedRecords.length > 0) {
      const failedCsv = this.exportDirtyRecordsToCSV(failedRecords);
      const failedPath = path.join(outputDir, `${batch.batchNo}_失败清单_${timestamp}.csv`);
      fs.writeFileSync(failedPath, failedCsv, 'utf-8');
      files.push(failedPath);
    }
    
    const checkinRecords = this.db.getCheckinRecords(batchId);
    if (checkinRecords.length > 0) {
      const checkinCsv = this.exportCheckinToCSV(checkinRecords);
      const checkinPath = path.join(outputDir, `${batch.batchNo}_入住单_修正后_${timestamp}.csv`);
      fs.writeFileSync(checkinPath, checkinCsv, 'utf-8');
      files.push(checkinPath);
    }
    
    const depositRecords = this.db.getDepositRecords(batchId);
    if (depositRecords.length > 0) {
      const depositCsv = this.exportDepositToCSV(depositRecords);
      const depositPath = path.join(outputDir, `${batch.batchNo}_押金流水_修正后_${timestamp}.csv`);
      fs.writeFileSync(depositPath, depositCsv, 'utf-8');
      files.push(depositPath);
    }
    
    const roomChangeRecords = this.db.getRoomChangeRecords(batchId);
    if (roomChangeRecords.length > 0) {
      const roomChangeCsv = this.exportRoomChangeToCSV(roomChangeRecords);
      const roomChangePath = path.join(outputDir, `${batch.batchNo}_换房记录_修正后_${timestamp}.csv`);
      fs.writeFileSync(roomChangePath, roomChangeCsv, 'utf-8');
      files.push(roomChangePath);
    }
    
    const shiftRecords = this.db.getShiftRecords(batchId);
    if (shiftRecords.length > 0) {
      const shiftCsv = this.exportShiftToCSV(shiftRecords);
      const shiftPath = path.join(outputDir, `${batch.batchNo}_班次记录_修正后_${timestamp}.csv`);
      fs.writeFileSync(shiftPath, shiftCsv, 'utf-8');
      files.push(shiftPath);
    }
    
    const supplementRecords = this.db.getSupplementRecords(batchId);
    if (supplementRecords.length > 0) {
      const supplementCsv = this.exportSupplementToCSV(supplementRecords);
      const supplementPath = path.join(outputDir, `${batch.batchNo}_临时补录_修正后_${timestamp}.csv`);
      fs.writeFileSync(supplementPath, supplementCsv, 'utf-8');
      files.push(supplementPath);
    }
    
    const summaryReport = this.generateSummaryReport(batchId);
    const summaryPath = path.join(outputDir, `${batch.batchNo}_夜审报告_${timestamp}.txt`);
    fs.writeFileSync(summaryPath, summaryReport, 'utf-8');
    files.push(summaryPath);
    
    return { files };
  }
  
  private exportDirtyRecordsToCSV(records: any[]): string {
    const fields = [
      'id', 'recordId', 'recordType', 'dirtyType', 'fieldName',
      'expectedValue', 'actualValue', 'description', 'status',
      'fixedBy', 'fixedAt', 'fixRemark', 'detectedAt', 'importBatch'
    ];
    const parser = new Parser({ fields });
    return parser.parse(records);
  }
  
  private exportCheckinToCSV(records: any[]): string {
    const fields = [
      'sourceRowNumber', 'orderNo', 'guestName', 'roomNo', 'roomType',
      'checkinDate', 'checkoutDate', 'roomRate', 'depositAmount',
      'operator', 'status', 'sourceFile', 'importBatch'
    ];
    const parser = new Parser({ fields });
    return parser.parse(records);
  }
  
  private exportDepositToCSV(records: any[]): string {
    const fields = [
      'sourceRowNumber', 'transactionNo', 'orderNo', 'guestName',
      'amount', 'paymentMethod', 'transactionType', 'operator',
      'transactionTime', 'sourceFile', 'importBatch'
    ];
    const parser = new Parser({ fields });
    return parser.parse(records);
  }
  
  private exportRoomChangeToCSV(records: any[]): string {
    const fields = [
      'sourceRowNumber', 'changeNo', 'orderNo', 'guestName',
      'oldRoomNo', 'newRoomNo', 'oldRoomType', 'newRoomType',
      'oldRoomRate', 'newRoomRate', 'changeTime', 'operator',
      'reason', 'sourceFile', 'importBatch'
    ];
    const parser = new Parser({ fields });
    return parser.parse(records);
  }
  
  private exportShiftToCSV(records: any[]): string {
    const fields = [
      'sourceRowNumber', 'shiftNo', 'shiftDate', 'shiftType',
      'operator', 'checkinCount', 'checkoutCount', 'totalDeposit',
      'totalRefund', 'totalRevenue', 'handoverTime', 'sourceFile', 'importBatch'
    ];
    const parser = new Parser({ fields });
    return parser.parse(records);
  }
  
  private exportSupplementToCSV(records: any[]): string {
    const fields = [
      'sourceRowNumber', 'supplementNo', 'orderNo', 'guestName',
      'supplementType', 'amount', 'operator', 'supplementTime',
      'reason', 'sourceFile', 'importBatch'
    ];
    const parser = new Parser({ fields });
    return parser.parse(records);
  }
  
  private generateSummaryReport(batchId: string): string {
    const batch = this.db.getBatch(batchId)!;
    const dirtyRecords = this.db.getDirtyRecords(batchId);
    const statusChanges = this.db.getStatusChanges(undefined, batchId);
    
    const checkinRecords = this.db.getCheckinRecords(batchId);
    const depositRecords = this.db.getDepositRecords(batchId);
    const roomChangeRecords = this.db.getRoomChangeRecords(batchId);
    const shiftRecords = this.db.getShiftRecords(batchId);
    const supplementRecords = this.db.getSupplementRecords(batchId);
    
    const actualTotalRecords = 
      checkinRecords.length + 
      depositRecords.length + 
      roomChangeRecords.length + 
      shiftRecords.length + 
      supplementRecords.length;
    
    const dirtyTypeMap: Record<DirtyType, string> = {
      missing_field: '缺失字段',
      cross_day: '跨日异常',
      name_changed: '姓名变更',
      amount_conflict: '金额冲突',
      quantity_conflict: '数量冲突',
      duplicate: '重复记录',
      invalid_data: '无效数据'
    };
    
    let report = `
=============================================
      酒店前台夜审多源导入巡检报告
=============================================

批次号: ${batch.batchNo}
数据源: 多源合并 (入住单/押金流水/换房记录/班次记录)
文件名: 多源数据
导入时间: ${batch.createdAt}

---------------------------------------------
                汇总统计
---------------------------------------------
总记录数: ${actualTotalRecords}
  - 入住单: ${checkinRecords.length}
  - 押金流水: ${depositRecords.length}
  - 换房记录: ${roomChangeRecords.length}
  - 班次记录: ${shiftRecords.length}
  - 临时补录: ${supplementRecords.length}
脏记录数: ${dirtyRecords.length}
  - 待处理: ${dirtyRecords.filter(d => d.status === 'pending').length}
  - 已修复: ${dirtyRecords.filter(d => d.status === 'fixed').length}
  - 已忽略: ${dirtyRecords.filter(d => d.status === 'ignored').length}

---------------------------------------------
              问题类型分布
---------------------------------------------
`;

    const typeCounts = new Map<DirtyType, number>();
    for (const dirty of dirtyRecords) {
      typeCounts.set(dirty.dirtyType, (typeCounts.get(dirty.dirtyType) || 0) + 1);
    }
    
    for (const [type, count] of typeCounts) {
      report += `${dirtyTypeMap[type]}: ${count}条\n`;
    }

    if (statusChanges.length > 0) {
      report += `
---------------------------------------------
              状态变更历史
---------------------------------------------
`;
      for (const change of statusChanges.slice(0, 20)) {
        report += `[${change.timestamp}] ${change.operator} (${change.operatorRole}) - ${change.reason}\n`;
      }
      if (statusChanges.length > 20) {
        report += `... 还有 ${statusChanges.length - 20} 条变更记录\n`;
      }
    }

    if (dirtyRecords.filter(d => d.status === 'pending').length > 0) {
      report += `
---------------------------------------------
              待处理问题清单
---------------------------------------------
`;
      for (const dirty of dirtyRecords.filter(d => d.status === 'pending').slice(0, 10)) {
        report += `
记录ID: ${dirty.recordId}
问题类型: ${dirtyTypeMap[dirty.dirtyType]}
描述: ${dirty.description}
建议: ${dirty.suggestion || '无'}
`;
      }
    }

    report += `
=============================================
                  报告结束
=============================================
`;
    
    return report;
  }
}
