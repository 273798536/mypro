const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { TraceabilityLedger } = require('../models/TraceabilityLedger');
const AuditLog = require('../models/AuditLog');

class ExportService {
  static maskSensitiveData(record, options = {}) {
    const masked = { ...record };
    
    if (masked.patient_name && options.maskPatient) {
      masked.patient_name = this.maskName(masked.patient_name);
    }
    
    if (masked.patient_phone && options.maskPhone) {
      masked.patient_phone = this.maskPhone(masked.patient_phone);
    }
    
    if (masked.supervisor_comment && options.maskComment) {
      masked.supervisor_comment = '***敏感信息已脱敏***';
    }
    
    return masked;
  }

  static maskName(name) {
    if (!name || name.length <= 1) return name;
    return name[0] + '*'.repeat(name.length - 1);
  }

  static maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  static async exportToCSV(options = {}) {
    const records = await TraceabilityLedger.getDetailedRecords(options);
    
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const filename = `traceability_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(exportDir, filename);
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'ledger_no', title: '台账编号' },
        { id: 'implant_batch_number', title: '种植体批号' },
        { id: 'product_name', title: '产品名称' },
        { id: 'manufacturer', title: '生产厂家' },
        { id: 'appointment_no', title: '预约编号' },
        { id: 'patient_name', title: '患者姓名' },
        { id: 'doctor_name', title: '医生姓名' },
        { id: 'department', title: '科室' },
        { id: 'invoice_no', title: '发票编号' },
        { id: 'supplier_name', title: '供应商' },
        { id: 'usage_date', title: '使用日期' },
        { id: 'usage_quantity', title: '使用数量' },
        { id: 'stock_after', title: '使用后库存' },
        { id: 'status', title: '状态' },
        { id: 'change_reason', title: '变更原因' },
        { id: 'created_by', title: '创建人' },
        { id: 'created_at', title: '创建时间' },
        { id: 'version', title: '版本号' }
      ]
    });
    
    const processedRecords = records.map(r => {
      let processed = { ...r };
      if (options.sensitive_masked) {
        processed = this.maskSensitiveData(processed, {
          maskPatient: true,
          maskPhone: true,
          maskComment: true
        });
      }
      return processed;
    });
    
    await csvWriter.writeRecords(processedRecords);
    
    return {
      filename,
      filePath,
      recordCount: records.length,
      sensitive_masked: options.sensitive_masked || false
    };
  }

  static async exportAuditLog(ledgerId, options = {}) {
    const logs = await AuditLog.findByLedgerId(ledgerId);
    
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const filename = `audit_log_${ledgerId}_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filePath = path.join(exportDir, filename);
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'action', title: '操作类型' },
        { id: 'operator_name', title: '操作人' },
        { id: 'operator_role', title: '操作人角色' },
        { id: 'operation_time', title: '操作时间' },
        { id: 'changed_fields', title: '变更字段' },
        { id: 'remark', title: '备注' }
      ]
    });
    
    const processedLogs = logs.map(log => ({
      ...log,
      changed_fields: log.changed_fields ? log.changed_fields.join(', ') : ''
    }));
    
    await csvWriter.writeRecords(processedLogs);
    
    return {
      filename,
      filePath,
      recordCount: logs.length
    };
  }

  static getExportFiles() {
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      return [];
    }
    
    const files = fs.readdirSync(exportDir)
      .filter(f => f.endsWith('.csv'))
      .map(f => {
        const fullPath = path.join(exportDir, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          size: stats.size,
          created_at: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return files;
  }
}

module.exports = ExportService;
