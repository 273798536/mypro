import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { Database, RecordStatus } from '../types';
import { generateReport, Report } from './report';
import { getDirtyRecordsByRecordId } from '../utils/database';
import { getDirtyTypeName } from '../utils/detector';
import { getDataSourceName } from '../utils/importer';

interface ExportOptions {
  format: 'csv' | 'json';
  includeRaw?: boolean;
  includeFailed?: boolean;
  includeFixed?: boolean;
}

async function exportToJson(
  db: Database,
  outputPath: string,
  report: Report
): Promise<string> {
  const exportData = {
    generatedAt: report.generatedAt,
    generatedBy: report.generatedBy,
    summary: report.summary,
    records: db.records.map(r => ({
      id: r.id,
      source: getDataSourceName(r.source),
      sourceLine: r.sourceLine,
      sourceFile: r.sourceFile,
      batchNumber: r.batchNumber,
      materialName: r.materialName,
      materialType: r.materialType,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      totalAmount: r.totalAmount,
      supplier: r.supplier,
      patientName: r.patientName,
      appointmentDate: r.appointmentDate,
      invoiceNumber: r.invoiceNumber,
      status: r.status,
      importedBy: r.importedBy,
      issues: getDirtyRecordsByRecordId(db, r.id).map(d => ({
        type: getDirtyTypeName(d.dirtyType),
        field: d.fieldName,
        description: d.description,
        resolved: d.resolved
      }))
    }))
  };

  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
  return outputPath;
}

async function exportToCsv(
  db: Database,
  outputPath: string,
  report: Report
): Promise<string> {
  const records = db.records.map(r => {
    const dirtyRecords = getDirtyRecordsByRecordId(db, r.id);
    const issues = dirtyRecords
      .filter(d => !d.resolved)
      .map(d => getDirtyTypeName(d.dirtyType))
      .join('; ');
    
    return {
      id: r.id,
      source: getDataSourceName(r.source),
      sourceLine: r.sourceLine,
      sourceFile: r.sourceFile,
      batchNumber: r.batchNumber,
      materialName: r.materialName,
      materialType: r.materialType,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      totalAmount: r.totalAmount,
      supplier: r.supplier,
      patientName: r.patientName || '',
      appointmentDate: r.appointmentDate || '',
      invoiceNumber: r.invoiceNumber || '',
      status: r.status,
      importedBy: r.importedBy,
      hasIssues: dirtyRecords.length > 0 ? '是' : '否',
      issues
    };
  });

  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'source', title: '数据来源' },
      { id: 'sourceLine', title: '原始行号' },
      { id: 'sourceFile', title: '源文件' },
      { id: 'batchNumber', title: '批号' },
      { id: 'materialName', title: '材料名称' },
      { id: 'materialType', title: '类型' },
      { id: 'quantity', title: '数量' },
      { id: 'unitPrice', title: '单价' },
      { id: 'totalAmount', title: '总金额' },
      { id: 'supplier', title: '供应商' },
      { id: 'patientName', title: '患者姓名' },
      { id: 'appointmentDate', title: '预约日期' },
      { id: 'invoiceNumber', title: '发票号' },
      { id: 'status', title: '状态' },
      { id: 'importedBy', title: '导入人' },
      { id: 'hasIssues', title: '有问题' },
      { id: 'issues', title: '问题类型' }
    ]
  });

  await csvWriter.writeRecords(records);
  return outputPath;
}

export async function exportData(
  db: Database,
  outputDir: string,
  options: ExportOptions,
  generatedBy: string
): Promise<string> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const report = generateReport(db, generatedBy);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `material-inspection-${timestamp}.${options.format}`;
  const outputPath = path.join(outputDir, fileName);

  if (options.format === 'json') {
    return await exportToJson(db, outputPath, report);
  } else {
    return await exportToCsv(db, outputPath, report);
  }
}

export async function exportFailedRecords(
  db: Database,
  outputDir: string,
  generatedBy: string
): Promise<string> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const report = generateReport(db, generatedBy);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `failed-records-${timestamp}.csv`;
  const outputPath = path.join(outputDir, fileName);

  const failedRecords = report.failedRecords.map(fr => ({
    recordId: fr.recordId,
    source: fr.source,
    sourceLine: fr.sourceLine,
    sourceFile: fr.sourceFile,
    batchNumber: fr.batchNumber,
    materialName: fr.materialName,
    issues: fr.issues.join('; ')
  }));

  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'recordId', title: '记录ID' },
      { id: 'source', title: '数据来源' },
      { id: 'sourceLine', title: '原始行号' },
      { id: 'sourceFile', title: '源文件' },
      { id: 'batchNumber', title: '批号' },
      { id: 'materialName', title: '材料名称' },
      { id: 'issues', title: '问题描述' }
    ]
  });

  await csvWriter.writeRecords(failedRecords);
  return outputPath;
}
