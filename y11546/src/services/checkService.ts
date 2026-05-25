import dayjs from 'dayjs';
import { DataSourceType, CheckResult, ReportData } from '../models/types';
import { MaterialDAO, CheckResultDAO, FailedRecordDAO } from '../db/dao';

export class CheckService {
  private materialDAO: MaterialDAO;
  private checkResultDAO: CheckResultDAO;
  private failedRecordDAO: FailedRecordDAO;

  constructor(workDir?: string) {
    this.materialDAO = new MaterialDAO(workDir);
    this.checkResultDAO = new CheckResultDAO(workDir);
    this.failedRecordDAO = new FailedRecordDAO(workDir);
  }

  async checkConsistency(sourceType: DataSourceType): Promise<CheckResult> {
    const data = await this.materialDAO.findAll(sourceType);
    const issues: CheckResult['issues'] = [];

    const materialCodes = new Set<string>();
    const duplicates: string[] = [];

    for (const item of data) {
      if (materialCodes.has(item.material_code)) {
        duplicates.push(item.material_code);
      }
      materialCodes.add(item.material_code);
    }

    for (const code of duplicates) {
      const items = data.filter((d) => d.material_code === code);
      issues.push({
        type: 'duplicate_material',
        severity: 'warning',
        material_code: code,
        original_line_no: items[0].original_line_no,
        message: `物料编码 ${code} 重复出现 ${items.length} 次`,
        suggestion: '建议检查数据来源，确认是否为同一物料的多次导入',
      });
    }

    for (const item of data) {
      if (!item.material_code || item.material_code.trim() === '') {
        issues.push({
          type: 'empty_code',
          severity: 'error',
          material_code: item.material_code || 'EMPTY',
          original_line_no: item.original_line_no,
          message: '物料编码为空',
          suggestion: '请补充物料编码',
        });
      }

      if (!item.material_name || item.material_name.trim() === '') {
        issues.push({
          type: 'empty_name',
          severity: 'error',
          material_code: item.material_code,
          original_line_no: item.original_line_no,
          message: '物料名称为空',
          suggestion: '请补充物料名称',
        });
      }

      if (item.quantity < 0) {
        issues.push({
          type: 'negative_quantity',
          severity: 'error',
          material_code: item.material_code,
          original_line_no: item.original_line_no,
          message: `数量为负数: ${item.quantity}`,
          suggestion: '请检查数量是否正确',
        });
      }

      if (sourceType === 'on_site_borrow') {
        const borrow = item as any;
        if (borrow.return_status === 'lost' && !borrow.keeper) {
          issues.push({
            type: 'lost_no_keeper',
            severity: 'warning',
            material_code: item.material_code,
            original_line_no: item.original_line_no,
            message: '丢失的物料未登记保管员',
            suggestion: '请补充保管员信息，便于追溯责任',
          });
        }
      }

      if (sourceType === 'inventory_diff') {
        const diff = item as any;
        if (diff.diff_type === 'shortage' && (!diff.reason || diff.reason.trim() === '')) {
          issues.push({
            type: 'shortage_no_reason',
            severity: 'warning',
            material_code: item.material_code,
            original_line_no: item.original_line_no,
            message: '盘亏物料未说明原因',
            suggestion: '请补充盘亏原因',
          });
        }
      }

      if (sourceType === 'logistics_receipt') {
        const receipt = item as any;
        if (!receipt.waybill_no || receipt.waybill_no.trim() === '') {
          issues.push({
            type: 'no_waybill_no',
            severity: 'error',
            material_code: item.material_code,
            original_line_no: item.original_line_no,
            message: '运单号为空',
            suggestion: '请补充运单号',
          });
        }
        if (!receipt.sign_status || receipt.sign_status === 'unsigned') {
          issues.push({
            type: 'logistics_unsigned',
            severity: 'warning',
            material_code: item.material_code,
            original_line_no: item.original_line_no,
            message: '运单未签收',
            suggestion: '请确认物流签收状态',
          });
        }
        if (receipt.sign_status === 'rejected') {
          issues.push({
            type: 'logistics_rejected',
            severity: 'error',
            material_code: item.material_code,
            original_line_no: item.original_line_no,
            message: '运单被拒收，物料未入库',
            suggestion: '请联系供应商或物流处理拒收问题',
          });
        }
      }
    }

    const consistentCount = data.length - issues.filter((i) => i.severity === 'error').length;

    const result: Omit<CheckResult, 'id'> = {
      check_time: dayjs().toISOString(),
      source_type: sourceType,
      total_count: data.length,
      consistent_count: consistentCount,
      diff_count: issues.length,
      issues: issues,
    };

    const id = await this.checkResultDAO.create(result);

    return {
      ...result,
      id,
    };
  }

  async crossCheck(): Promise<CheckResult> {
    const materials = await this.materialDAO.findAll('material_list');
    const logistics = await this.materialDAO.findAll('logistics_receipt');
    const borrows = await this.materialDAO.findAll('on_site_borrow');
    const diffs = await this.materialDAO.findAll('inventory_diff');

    const issues: CheckResult['issues'] = [];

    const materialMap = new Map(materials.map((m) => [m.material_code, m]));

    for (const receipt of logistics) {
      const receiptData = receipt as any;
      if (!materialMap.has(receiptData.material_code)) {
        issues.push({
          type: 'logistics_not_in_list',
          severity: 'warning',
          material_code: receiptData.material_code,
          original_line_no: receiptData.original_line_no,
          message: '物流签收中的物料不在物料清单中',
          suggestion: '请检查是否漏登物料清单',
        });
      }

      if (!receiptData.sign_status || receiptData.sign_status === 'unsigned') {
        issues.push({
          type: 'logistics_unsigned',
          severity: 'warning',
          material_code: receiptData.material_code,
          original_line_no: receiptData.original_line_no,
          message: '运单未签收',
          suggestion: '请确认物流签收状态',
        });
      }

      if (receiptData.sign_status === 'rejected') {
        issues.push({
          type: 'logistics_rejected',
          severity: 'error',
          material_code: receiptData.material_code,
          original_line_no: receiptData.original_line_no,
          message: '运单被拒收，物料未入库',
          suggestion: '请联系供应商或物流处理拒收问题',
        });
      }
    }

    const logisticsMap = new Map<string, any[]>();
    for (const receipt of logistics) {
      const receiptData = receipt as any;
      if (receiptData.sign_status === 'signed') {
        if (!logisticsMap.has(receiptData.material_code)) {
          logisticsMap.set(receiptData.material_code, []);
        }
        logisticsMap.get(receiptData.material_code)!.push(receiptData);
      }
    }

    for (const [code, receipts] of logisticsMap) {
      const totalReceived = receipts.reduce((sum, r) => sum + r.quantity, 0);
      const material = materialMap.get(code);
      if (material && totalReceived !== material.quantity) {
        issues.push({
          type: 'logistics_quantity_mismatch',
          severity: 'error',
          material_code: code,
          original_line_no: receipts[0].original_line_no,
          message: `物流签收总量(${totalReceived})与物料清单数量(${material.quantity})不一致`,
          suggestion: '请核对物流签收和物料清单数量',
        });
      }
    }

    for (const borrow of borrows) {
      if (!materialMap.has(borrow.material_code)) {
        issues.push({
          type: 'borrow_not_in_list',
          severity: 'warning',
          material_code: borrow.material_code,
          original_line_no: borrow.original_line_no,
          message: '借用记录中的物料不在物料清单中',
          suggestion: '请检查是否漏登物料清单',
        });
      }
    }

    for (const diff of diffs) {
      if (!materialMap.has(diff.material_code)) {
        issues.push({
          type: 'diff_not_in_list',
          severity: 'warning',
          material_code: diff.material_code,
          original_line_no: diff.original_line_no,
          message: '盘点差异中的物料不在物料清单中',
          suggestion: '请检查是否漏登物料清单',
        });
      }
    }

    const borrowMap = new Map<string, any[]>();
    for (const borrow of borrows) {
      if (!borrowMap.has(borrow.material_code)) {
        borrowMap.set(borrow.material_code, []);
      }
      borrowMap.get(borrow.material_code)!.push(borrow);
    }

    for (const [code, itemBorrows] of borrowMap) {
      const totalBorrowed = itemBorrows
        .filter((b) => b.return_status === 'borrowed' || b.return_status === 'lost')
        .reduce((sum, b) => sum + b.quantity, 0);

      const material = materialMap.get(code);
      if (material && totalBorrowed > material.quantity) {
        issues.push({
          type: 'borrow_exceed_stock',
          severity: 'error',
          material_code: code,
          message: `借用总量(${totalBorrowed})超过库存总量(${material.quantity})`,
          suggestion: '请检查借用记录或库存数量是否正确',
        });
      }
    }

    const totalCount = materials.length + logistics.length + borrows.length + diffs.length;

    const result: Omit<CheckResult, 'id'> = {
      check_time: dayjs().toISOString(),
      source_type: 'material_list',
      total_count: totalCount,
      consistent_count: totalCount - issues.filter((i) => i.severity === 'error').length,
      diff_count: issues.length,
      issues: issues,
    };

    const id = await this.checkResultDAO.create(result);

    return {
      ...result,
      id,
    };
  }

  async generateReport(): Promise<ReportData> {
    const materials = await this.materialDAO.findAll('material_list');
    const logistics = await this.materialDAO.findAll('logistics_receipt');
    const borrows = await this.materialDAO.findAll('on_site_borrow');
    const diffs = await this.materialDAO.findAll('inventory_diff');
    const failedRecords = await this.failedRecordDAO.findByStatus('pending');

    const materialMap = new Map(materials.map((m) => [m.material_code, m]));

    const logisticsStatus = {
      signed: 0,
      unsigned: 0,
      rejected: 0,
      total_quantity: 0,
    };

    let logisticsNotInList = 0;
    let borrowNotInList = 0;
    let diffNotInList = 0;
    let borrowExceedStock = 0;

    const borrowMap = new Map<string, any[]>();

    for (const receipt of logistics) {
      const receiptData = receipt as any;
      const status = receiptData.sign_status || 'unsigned';
      if (status === 'signed') {
        logisticsStatus.signed++;
        logisticsStatus.total_quantity += receiptData.quantity;
      } else if (status === 'unsigned') {
        logisticsStatus.unsigned++;
      } else if (status === 'rejected') {
        logisticsStatus.rejected++;
      }

      if (!materialMap.has(receiptData.material_code)) {
        logisticsNotInList++;
      }
    }

    const borrowStatus = {
      borrowed: 0,
      returned: 0,
      lost: 0,
      unconfirmed: 0,
    };

    for (const borrow of borrows) {
      const borrowData = borrow as any;
      const status = borrowData.return_status || 'unconfirmed';
      if (status in borrowStatus) {
        (borrowStatus as any)[status]++;
      }

      if (!materialMap.has(borrowData.material_code)) {
        borrowNotInList++;
      }

      if (!borrowMap.has(borrowData.material_code)) {
        borrowMap.set(borrowData.material_code, []);
      }
      borrowMap.get(borrowData.material_code)!.push(borrowData);
    }

    for (const [code, itemBorrows] of borrowMap) {
      const totalBorrowed = itemBorrows
        .filter((b) => b.return_status === 'borrowed' || b.return_status === 'lost')
        .reduce((sum, b) => sum + b.quantity, 0);

      const material = materialMap.get(code);
      if (material && totalBorrowed > material.quantity) {
        borrowExceedStock++;
      }
    }

    const inventoryDiff = {
      surplus: 0,
      shortage: 0,
      consistent: 0,
    };

    for (const diff of diffs) {
      const diffData = diff as any;
      const type = diffData.diff_type;
      if (type in inventoryDiff) {
        (inventoryDiff as any)[type]++;
      }

      if (!materialMap.has(diffData.material_code)) {
        diffNotInList++;
      }
    }

    return {
      summary: {
        total_materials: materials.length,
        total_logistics: logistics.length,
        total_borrowed: borrows.length,
        total_lost: borrowStatus.lost,
        total_diffs: diffs.length,
      },
      failed_records: failedRecords,
      logistics_status: logisticsStatus,
      borrow_status: borrowStatus,
      inventory_diff: inventoryDiff,
      cross_check: {
        logistics_not_in_list: logisticsNotInList,
        borrow_not_in_list: borrowNotInList,
        diff_not_in_list: diffNotInList,
        borrow_exceed_stock: borrowExceedStock,
      },
    };
  }
}

export const checkService = new CheckService();
