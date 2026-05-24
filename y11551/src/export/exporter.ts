import * as ExcelJS from 'exceljs';
import * as path from 'path';
import dayjs from 'dayjs';
import { generateReport, getCabinetDetail } from '../business/report';
import { getFailureRecords, getBatches, getAuditLogs } from '../db/database';
import { SourceType } from '../types';

export async function exportReport(outputPath: string, city?: string): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '智能柜补货巡检工具';
  workbook.created = new Date();
  
  const reportData = await generateReport(city);
  
  const summarySheet = workbook.addWorksheet('汇总报表');
  summarySheet.columns = [
    { header: '城市', key: 'city', width: 15 },
    { header: '柜机ID', key: 'cabinetId', width: 20 },
    { header: '柜机名称', key: 'cabinetName', width: 20 },
    { header: '初始库存', key: 'initialStock', width: 12 },
    { header: '补货数量', key: 'restockQuantity', width: 12 },
    { header: '销售数量', key: 'salesQuantity', width: 12 },
    { header: '当前库存', key: 'currentStock', width: 12 },
    { header: '退款次数', key: 'refundCount', width: 12 },
    { header: '异常次数', key: 'exceptionCount', width: 12 },
    { header: '热销格口满仓数', key: 'hotSkuFullCount', width: 18 },
    { header: '最后更新时间', key: 'lastUpdateTime', width: 25 }
  ];
  
  summarySheet.addRows(reportData);
  
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  const detailSheet = workbook.addWorksheet('详细数据');
  let detailRow = 1;
  
  detailSheet.getCell(detailRow, 1).value = '柜机ID';
  detailSheet.getCell(detailRow, 2).value = '数据类型';
  detailSheet.getCell(detailRow, 3).value = '来源文件';
  detailSheet.getCell(detailRow, 4).value = '原始行号';
  detailSheet.getCell(detailRow, 5).value = '时间';
  detailSheet.getCell(detailRow, 6).value = '数量/金额';
  detailSheet.getCell(detailRow, 7).value = '备注';
  detailSheet.getRow(detailRow).font = { bold: true };
  detailRow++;
  
  for (const summary of reportData) {
    const detail = await getCabinetDetail(summary.cabinetId);
    
    for (const inv of detail.inventoryRecords) {
      detailSheet.getCell(detailRow, 1).value = summary.cabinetId;
      detailSheet.getCell(detailRow, 2).value = '库存';
      detailSheet.getCell(detailRow, 3).value = inv.source_file || '';
      detailSheet.getCell(detailRow, 4).value = inv.original_line_number;
      detailSheet.getCell(detailRow, 5).value = inv.record_time;
      detailSheet.getCell(detailRow, 6).value = inv.stock_quantity;
      detailSheet.getCell(detailRow, 7).value = inv.sku_name || '';
      detailRow++;
    }
    
    for (const restock of detail.restockRecords) {
      detailSheet.getCell(detailRow, 1).value = summary.cabinetId;
      detailSheet.getCell(detailRow, 2).value = '补货';
      detailSheet.getCell(detailRow, 3).value = restock.source_file || '';
      detailSheet.getCell(detailRow, 4).value = restock.original_line_number;
      detailSheet.getCell(detailRow, 5).value = restock.photo_time;
      detailSheet.getCell(detailRow, 6).value = restock.restock_quantity;
      detailSheet.getCell(detailRow, 7).value = restock.operator || '';
      detailRow++;
    }
    
    for (const refund of detail.refundRecords) {
      detailSheet.getCell(detailRow, 1).value = summary.cabinetId;
      detailSheet.getCell(detailRow, 2).value = '退款';
      detailSheet.getCell(detailRow, 3).value = refund.source_file || '';
      detailSheet.getCell(detailRow, 4).value = refund.original_line_number;
      detailSheet.getCell(detailRow, 5).value = refund.refund_time;
      detailSheet.getCell(detailRow, 6).value = refund.refund_amount;
      detailSheet.getCell(detailRow, 7).value = refund.refund_reason || '';
      detailRow++;
    }
    
    for (const ex of detail.exceptionRecords) {
      detailSheet.getCell(detailRow, 1).value = summary.cabinetId;
      detailSheet.getCell(detailRow, 2).value = '异常';
      detailSheet.getCell(detailRow, 3).value = ex.source_file || '';
      detailSheet.getCell(detailRow, 4).value = ex.original_line_number;
      detailSheet.getCell(detailRow, 5).value = ex.exception_time;
      detailSheet.getCell(detailRow, 6).value = '';
      detailSheet.getCell(detailRow, 7).value = ex.exception_type || '';
      detailRow++;
    }
  }
  
  const failureSheet = workbook.addWorksheet('失败清单');
  failureSheet.columns = [
    { header: '批次ID', key: 'batchId', width: 40 },
    { header: '数据类型', key: 'sourceType', width: 15 },
    { header: '原始行号', key: 'originalLineNumber', width: 12 },
    { header: '失败原因', key: 'failureReason', width: 40 },
    { header: '原始数据', key: 'rawData', width: 60 },
    { header: '记录时间', key: 'createdAt', width: 25 }
  ];
  
  const failureRecords = await getFailureRecords();
  failureSheet.addRows(failureRecords.map((f: any) => ({
    ...f,
    sourceType: getSourceTypeName(f.sourceType)
  })));
  
  failureSheet.getRow(1).font = { bold: true };
  failureSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE0E0' }
  };
  
  const fileName = `巡检报表_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  const fullPath = path.join(outputPath, fileName);
  
  await workbook.xlsx.writeFile(fullPath);
  
  return fullPath;
}

export async function exportFailureRecords(outputPath: string, batchId?: string): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '智能柜补货巡检工具';
  
  const sheet = workbook.addWorksheet('失败清单');
  sheet.columns = [
    { header: '序号', key: 'index', width: 8 },
    { header: '批次ID', key: 'batchId', width: 40 },
    { header: '数据类型', key: 'sourceType', width: 15 },
    { header: '原始行号', key: 'originalLineNumber', width: 12 },
    { header: '失败原因', key: 'failureReason', width: 40 },
    { header: '原始数据', key: 'rawData', width: 80 },
    { header: '记录时间', key: 'createdAt', width: 25 }
  ];
  
  const failures = await getFailureRecords(batchId);
  sheet.addRows(failures.map((f: any, i: number) => ({
    index: i + 1,
    ...f,
    sourceType: getSourceTypeName(f.sourceType)
  })));
  
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE0E0' }
  };
  
  const fileName = `失败清单_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  const fullPath = path.join(outputPath, fileName);
  
  await workbook.xlsx.writeFile(fullPath);
  
  return fullPath;
}

function getSourceTypeName(type: SourceType): string {
  const names: Record<SourceType, string> = {
    [SourceType.CABINET_INVENTORY]: '柜机库存',
    [SourceType.RESTOCK_PHOTO]: '补货照片',
    [SourceType.REFUND_RECORD]: '退款记录',
    [SourceType.EXCEPTION_PHOTO]: '异常照片',
    [SourceType.SMS_SCREENSHOT]: '短信截图'
  };
  return names[type] || type;
}
