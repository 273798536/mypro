const db = require('../config/database');
const { Parser } = require('json2csv');

class ExportService {
  async exportAuditRecords(batchId, options = {}) {
    const { format = 'csv', status = null } = options;
    
    const records = await this.getRecordsForExport(batchId, status);
    
    if (format === 'json') {
      return this.exportJSON(records);
    }
    
    return this.exportCSV(records);
  }

  getRecordsForExport(batchId, status = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          ar.period,
          s.store_code,
          s.store_name,
          s.mall_name,
          c.contract_no,
          c.version as contract_version,
          ar.base_rent,
          ar.commission_amount,
          ar.total_rent,
          ar.sales_amount,
          ar.refund_adjustment,
          ar.activity_adjustment,
          ar.status,
          ar.issue_type,
          ar.issue_description,
          ar.correction_hint,
          ar.follow_up_action,
          ar.created_at,
          ar.previous_record_id
        FROM audit_records ar
        JOIN stores s ON ar.store_id = s.id
        LEFT JOIN contracts c ON ar.contract_id = c.id
        WHERE ar.batch_id = ?
      `;
      let params = [batchId];
      
      if (status) {
        query += ' AND ar.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY s.store_code';
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  exportCSV(records) {
    const fields = [
      { label: '期间', value: 'period' },
      { label: '门店编码', value: 'store_code' },
      { label: '门店名称', value: 'store_name' },
      { label: '所属商场', value: 'mall_name' },
      { label: '合同编号', value: 'contract_no' },
      { label: '合同版本', value: 'contract_version' },
      { label: '保底租金', value: 'base_rent' },
      { label: '抽成金额', value: 'commission_amount' },
      { label: '应缴租金总额', value: 'total_rent' },
      { label: '销售金额', value: 'sales_amount' },
      { label: '退款调整', value: 'refund_adjustment' },
      { label: '活动扣减调整', value: 'activity_adjustment' },
      { label: '状态', value: 'status' },
      { label: '问题类型', value: 'issue_type' },
      { label: '问题描述', value: 'issue_description' },
      { label: '修正提示', value: 'correction_hint' },
      { label: '后续动作', value: 'follow_up_action' },
      { label: '创建时间', value: 'created_at' }
    ];

    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(records);
  }

  exportJSON(records) {
    return JSON.stringify(records, null, 2);
  }

  async exportTrialCalculation(recordId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          s.store_code,
          s.store_name,
          ar.period,
          ar.trial_calculation,
          ar.sales_amount,
          ar.base_rent,
          ar.commission_amount,
          ar.total_rent
        FROM audit_records ar
        JOIN stores s ON ar.store_id = s.id
        WHERE ar.id = ?
      `, [recordId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          reject(new Error('记录不存在'));
          return;
        }

        const trialCalc = JSON.parse(row.trial_calculation || '[]');
        const output = {
          store_code: row.store_code,
          store_name: row.store_name,
          period: row.period,
          sales_amount: row.sales_amount,
          base_rent: row.base_rent,
          trial_calculation: trialCalc,
          final_commission: row.commission_amount,
          final_total_rent: row.total_rent
        };
        
        resolve(JSON.stringify(output, null, 2));
      });
    });
  }

  async exportImpactReport(batchId) {
    const records = await this.getRecordsWithChanges(batchId);
    
    const changedRecords = records.filter(r => r.changed_fields && r.changed_fields.length > 0);
    
    const report = {
      batchId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRecords: records.length,
        changedRecords: changedRecords.length,
        unchangedRecords: records.length - changedRecords.length
      },
      changes: changedRecords.map(r => ({
        store_code: r.store_code,
        store_name: r.store_name,
        changes: r.changed_fields
      }))
    };
    
    return JSON.stringify(report, null, 2);
  }

  getRecordsWithChanges(batchId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          s.store_code,
          s.store_name,
          ar.changed_fields
        FROM audit_records ar
        JOIN stores s ON ar.store_id = s.id
        WHERE ar.batch_id = ?
        ORDER BY s.store_code
      `, [batchId], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        rows.forEach(r => {
          if (r.changed_fields) {
            r.changed_fields = JSON.parse(r.changed_fields);
          }
        });
        
        resolve(rows);
      });
    });
  }

  async getSalesExport(storeId, period) {
    return new Promise((resolve, reject) => {
      const [year, month] = period.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      db.all(`
        SELECT 
          sd.sale_date,
          s.store_code,
          s.store_name,
          sd.category,
          sd.gross_amount,
          sd.refund_amount,
          sd.net_amount,
          sd.activity_deduction,
          sd.source_batch
        FROM sales_data sd
        JOIN stores s ON sd.store_id = s.id
        WHERE sd.store_id = ? AND sd.sale_date BETWEEN ? AND ?
        ORDER BY sd.sale_date
      `, [storeId, startDate, endDate], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const fields = [
          { label: '销售日期', value: 'sale_date' },
          { label: '门店编码', value: 'store_code' },
          { label: '门店名称', value: 'store_name' },
          { label: '品类', value: 'category' },
          { label: '销售金额', value: 'gross_amount' },
          { label: '退款金额', value: 'refund_amount' },
          { label: '净销售', value: 'net_amount' },
          { label: '活动扣减', value: 'activity_deduction' },
          { label: '来源批次', value: 'source_batch' }
        ];
        
        const json2csvParser = new Parser({ fields });
        resolve(json2csvParser.parse(rows));
      });
    });
  }
}

module.exports = new ExportService();
