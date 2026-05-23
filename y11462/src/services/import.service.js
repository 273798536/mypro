const { db } = require('../config/database');
const QueueService = require('./queue.service');
const { SOURCE_TYPES, MATERIAL_TYPES } = require('../constants/status');

class ImportService {
  static async createImportRecord(sourceFile, sourceType, importedBy, remark) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO import_records (source_file, source_type, imported_by, remark)
         VALUES (?, ?, ?, ?)`,
        [sourceFile, sourceType, importedBy || null, remark || null],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static async updateImportRecord(importId, { totalRows, successRows, failedRows }) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE import_records 
         SET total_rows = ?, success_rows = ?, failed_rows = ?
         WHERE id = ?`,
        [totalRows, successRows, failedRows, importId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  static async getImportRecord(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM import_records WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static async listImportRecords({ sourceType, page = 1, pageSize = 20 } = {}) {
    let whereClause = [];
    let params = [];

    if (sourceType) {
      whereClause.push('source_type = ?');
      params.push(sourceType);
    }

    const whereSql = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM import_records ${whereSql} ORDER BY imported_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
        (err, rows) => {
          if (err) reject(err);
          else {
            db.get(
              `SELECT COUNT(*) as total FROM import_records ${whereSql}`,
              params,
              (err, countRow) => {
                if (err) reject(err);
                else resolve({
                  list: rows,
                  total: countRow.total,
                  page,
                  pageSize
                });
              }
            );
          }
        }
      );
    });
  }

  static parseImplantBatch(row, sourceFile, sourceRow) {
    return {
      batchNo: row['批号'] || row['batch_no'] || row['batchNo'],
      materialType: MATERIAL_TYPES.IMPLANT,
      materialName: row['名称'] || row['name'] || row['material_name'] || '种植体',
      materialSpec: row['规格'] || row['spec'] || row['material_spec'],
      originalData: row,
      parsedData: {
        manufacturer: row['厂商'] || row['manufacturer'],
        expireDate: row['有效期'] || row['expire_date']
      },
      sourceFile,
      sourceRow
    };
  }

  static parseAppointment(row, sourceFile, sourceRow) {
    return {
      batchNo: row['种植体批号'] || row['implant_batch'] || row['batch_no'] || row['batchNo'],
      materialType: MATERIAL_TYPES.IMPLANT,
      appointmentNo: row['预约号'] || row['appointment_no'] || row['appointmentNo'],
      patientName: row['患者姓名'] || row['patient_name'] || row['patientName'],
      materialName: row['材料名称'] || row['material_name'] || '种植体',
      materialSpec: row['规格型号'] || row['spec'],
      originalData: row,
      parsedData: {
        appointmentDate: row['预约日期'] || row['appointment_date'],
        doctor: row['医生'] || row['doctor'],
        department: row['科室'] || row['department']
      },
      sourceFile,
      sourceRow,
      department: row['科室'] || row['department']
    };
  }

  static parseSupplierInvoice(row, sourceFile, sourceRow) {
    return {
      batchNo: row['批号'] || row['batch_no'] || row['batchNo'],
      materialType: row['材料类型'] || row['material_type'] || MATERIAL_TYPES.OTHER,
      invoiceNo: row['发票号'] || row['invoice_no'] || row['invoiceNo'],
      materialName: row['材料名称'] || row['material_name'],
      materialSpec: row['规格'] || row['spec'],
      originalData: row,
      parsedData: {
        supplier: row['供应商'] || row['supplier'],
        quantity: row['数量'] || row['quantity'],
        unitPrice: row['单价'] || row['unit_price'],
        totalAmount: row['总金额'] || row['total_amount']
      },
      sourceFile,
      sourceRow
    };
  }

  static parseApprovalEmail(row, sourceFile, sourceRow) {
    return {
      batchNo: row['种植体批号'] || row['batch_no'] || row['batchNo'],
      materialType: MATERIAL_TYPES.IMPLANT,
      approvalEmailId: row['邮件ID'] || row['email_id'] || row['emailId'],
      materialName: row['材料名称'] || row['material_name'] || '种植体',
      patientName: row['患者'] || row['patient_name'],
      originalData: row,
      parsedData: {
        approver: row['审批人'] || row['approver'],
        approvalDate: row['审批日期'] || row['approval_date'],
        approvalResult: row['审批结果'] || row['approval_result'],
        changeReason: row['更换原因'] || row['change_reason']
      },
      sourceFile,
      sourceRow
    };
  }

  static async importData(sourceType, rows, sourceFile, importedBy, remark) {
    const importId = await this.createImportRecord(sourceFile, sourceType, importedBy, remark);
    let successCount = 0;
    let failedCount = 0;
    const results = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sourceRow = i + 1;

      try {
        let queueData;
        switch (sourceType) {
          case SOURCE_TYPES.IMPLANT_BATCH:
            queueData = this.parseImplantBatch(row, sourceFile, sourceRow);
            break;
          case SOURCE_TYPES.APPOINTMENT:
            queueData = this.parseAppointment(row, sourceFile, sourceRow);
            break;
          case SOURCE_TYPES.SUPPLIER_INVOICE:
          case SOURCE_TYPES.SUPPLIER_STATEMENT:
            queueData = this.parseSupplierInvoice(row, sourceFile, sourceRow);
            break;
          case SOURCE_TYPES.APPROVAL_EMAIL:
            queueData = this.parseApprovalEmail(row, sourceFile, sourceRow);
            break;
          default:
            throw new Error(`不支持的来源类型: ${sourceType}`);
        }

        if (!queueData.batchNo) {
          throw new Error('缺少批号信息');
        }

        queueData.importId = importId;
        const result = await QueueService.submit(queueData);
        successCount++;
        results.push({ sourceRow, success: true, ...result });
      } catch (error) {
        failedCount++;
        results.push({ sourceRow, success: false, error: error.message });
      }
    }

    await this.updateImportRecord(importId, {
      totalRows: rows.length,
      successRows: successCount,
      failedRows: failedCount
    });

    return {
      importId,
      total: rows.length,
      success: successCount,
      failed: failedCount,
      results
    };
  }
}

module.exports = ImportService;
