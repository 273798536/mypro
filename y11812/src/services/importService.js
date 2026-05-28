const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const csv = require('csv-parser');

class ImportService {
  async importStores(data, batchId = null) {
    const results = {
      total: data.length,
      success: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        await this.saveStore(row);
        results.success++;
      } catch (err) {
          results.errors.push({ row: i + 1, error: err.message, data: row });
      }
    }

    await this.logImport('stores', results, batchId);
    return results;
  }

  async importContracts(data, batchId = null) {
    const results = {
      total: data.length,
      success: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        await this.saveContract(row);
        results.success++;
      } catch (err) {
          results.errors.push({ row: i + 1, error: err.message, data: row });
      }
    }

    await this.logImport('contracts', results, batchId);
    return results;
  }

  async importCommissionRules(data, batchId = null) {
    const results = {
      total: data.length,
      success: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        await this.saveCommissionRule(row);
        results.success++;
      } catch (err) {
        results.errors.push({ row: i + 1, error: err.message, data: row });
      }
    }

    await this.logImport('commission_rules', results, batchId);
    return results;
  }

  async importSales(data, batchId = null) {
    const results = {
      total: data.length,
      success: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        await this.saveSale(row, batchId);
        results.success++;
      } catch (err) {
        results.errors.push({ row: i + 1, error: err.message, data: row });
      }
    }

    await this.logImport('sales', results, batchId);
    return results;
  }

  saveStore(row) {
    return new Promise((resolve, reject) => {
      const validation = this.validateStoreRow(row);
      if (validation.errors.length > 0) {
        reject(new Error(validation.errors.join('; ')));
        return;
      }

      const id = row.id || uuidv4();
      
      db.run(`
        INSERT OR REPLACE INTO stores 
        (id, store_code, store_name, mall_name, address, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        id, row.store_code, row.store_name, row.mall_name || null,
        row.address || null, row.status || 'active'
      ], function(err) {
        if (err) reject(err);
        else resolve(id);
      });
    });
  }

  validateStoreRow(row) {
    const errors = [];
    const warnings = [];
    const missingFields = [];

    if (!row.store_code) {
      errors.push('门店编码不能为空');
      missingFields.push('store_code');
    }
    if (!row.store_name) {
      errors.push('门店名称不能为空');
      missingFields.push('store_name');
    }
    if (!row.mall_name) {
      warnings.push('缺少商场名称，将影响租金对账时的商场匹配');
      missingFields.push('mall_name');
    }

    return { errors, warnings, missingFields };
  }

  saveContract(row) {
    return new Promise((resolve, reject) => {
      const validation = this.validateContractRow(row);
      if (validation.errors.length > 0) {
        reject(new Error(validation.errors.join('; '));
        return;
      }

      const id = row.id || uuidv4();
      
      db.get('SELECT id FROM stores WHERE store_code = ?', [row.store_code], (err, store) => {
        if (err) {
          reject(err);
          return;
        }
        if (!store) {
          reject(new Error(`门店 ${row.store_code} 不存在`));
          return;
        }

        db.run(`
          INSERT OR REPLACE INTO contracts 
          (id, store_id, contract_no, version, effective_date, end_date, base_rent, rent_type, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, store.id, row.contract_no, row.version || 1,
          row.effective_date, row.end_date || null,
          parseFloat(row.base_rent) || 0,
          row.rent_type || 'guarantee_plus_commission',
          row.status || 'active'
        ], function(err) {
          if (err) reject(err);
          else resolve(id);
        });
      });
    });
  }

  validateContractRow(row) {
    const errors = [];
    const warnings = [];
    const missingFields = [];

    if (!row.store_code) {
      errors.push('门店编码不能为空');
      missingFields.push('store_code');
    }
    if (!row.contract_no) {
      errors.push('合同编号不能为空');
      missingFields.push('contract_no');
    }
    if (!row.effective_date) {
      errors.push('生效日期不能为空');
      missingFields.push('effective_date');
    }
    if (!row.base_rent) {
      warnings.push('缺少保底租金，计算时将视为0');
      missingFields.push('base_rent');
    }

    return { errors, warnings, missingFields };
  }

  saveCommissionRule(row) {
    return new Promise((resolve, reject) => {
      const validation = this.validateCommissionRuleRow(row);
      if (validation.errors.length > 0) {
        reject(new Error(validation.errors.join('; ')));
        return;
      }

      const id = row.id || uuidv4();
      
      db.get('SELECT id FROM contracts WHERE contract_no = ?', [row.contract_no], (err, contract) => {
        if (err) {
          reject(err);
          return;
        }
        if (!contract) {
          reject(new Error(`合同 ${row.contract_no} 不存在`));
          return;
        }

        db.run(`
          INSERT INTO commission_rules 
          (id, contract_id, rule_type, category, rate, threshold, tier_level, effective_date, end_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, contract.id, row.rule_type || 'tiered',
          row.category || null,
          parseFloat(row.rate) || 0,
          parseFloat(row.threshold) || 0,
          parseInt(row.tier_level) || 1,
          row.effective_date || null,
          row.end_date || null
        ], function(err) {
          if (err) reject(err);
          else resolve(id);
        });
      });
    });
  }

  validateCommissionRuleRow(row) {
    const errors = [];
    const warnings = [];
    const missingFields = [];

    if (!row.contract_no) {
      errors.push('合同编号不能为空');
      missingFields.push('contract_no');
    }
    if (!row.rule_type) {
      warnings.push('未指定规则类型，默认使用梯级抽成');
    }
    if (!row.rate) {
      warnings.push('未指定抽成比例');
      missingFields.push('rate');
    }

    return { errors, warnings, missingFields };
  }

  saveSale(row, sourceBatch = null) {
    return new Promise((resolve, reject) => {
      const validation = this.validateSaleRow(row);
      if (validation.errors.length > 0) {
        reject(new Error(validation.errors.join('; ')));
        return;
      }

      const id = row.id || uuidv4();
      
      db.get('SELECT id FROM stores WHERE store_code = ?', [row.store_code], (err, store) => {
        if (err) {
          reject(err);
          return;
        }
        if (!store) {
          reject(new Error(`门店 ${row.store_code} 不存在`));
          return;
        }

        const grossAmount = parseFloat(row.gross_amount) || 0;
        const refundAmount = parseFloat(row.refund_amount) || 0;
        const activityDeduction = parseFloat(row.activity_deduction) || 0;
        const netAmount = grossAmount - refundAmount - activityDeduction;

        db.run(`
          INSERT INTO sales_data 
          (id, store_id, sale_date, category, gross_amount, refund_amount, 
           net_amount, activity_deduction, source_batch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, store.id, row.sale_date,
          row.category || null,
          grossAmount, refundAmount, netAmount,
          activityDeduction,
          sourceBatch
        ], function(err) {
          if (err) reject(err);
          else resolve(id);
        });
      });
    });
  }

  validateSaleRow(row) {
    const errors = [];
    const warnings = [];
    const missingFields = [];

    if (!row.store_code) {
      errors.push('门店编码不能为空');
      missingFields.push('store_code');
    }
    if (!row.sale_date) {
      errors.push('销售日期不能为空');
      missingFields.push('sale_date');
    }
    if (!row.gross_amount) {
      errors.push('销售金额不能为空');
      missingFields.push('gross_amount');
    }

    return { errors, warnings, missingFields };
  }

  logImport(dataType, results, batchId = null) {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO import_logs 
        (id, batch_id, data_type, total_rows, success_rows, error_rows, errors)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), batchId, dataType, results.total, results.success,
        results.errors.length, JSON.stringify(results.errors)
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  generateImportTemplate(dataType) {
    const templates = {
      stores: [
        'store_code,store_name,mall_name,address,status',
        'S001,北京朝阳店,朝阳大悦城,北京市朝阳区朝阳北路101号,active'
      ],
      contracts: [
        'store_code,contract_no,version,effective_date,end_date,base_rent,rent_type,status',
        'S001,HT2024001,1,2024-01-01,2024-12-31,50000,guarantee_plus_commission,active'
      ],
      commission_rules: [
        'contract_no,rule_type,category,rate,threshold,tier_level,effective_date,end_date',
        'HT2024001,tiered,服装,0.08,0,1,2024-01-01,2024-12-31'
      ],
      sales: [
        'store_code,sale_date,category,gross_amount,refund_amount,activity_deduction',
        'S001,2024-01-15,服装,1500,0,0'
      ]
    };

    return templates[dataType] || [];
  }
}

module.exports = new ImportService();
