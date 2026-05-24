const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const csv = require('csv-parser');
const { getDatabase } = require('../models/database');
const TaskService = require('./TaskService');

class ImportService {
  async importFromFile(filePath, sourceFileName) {
    const db = await getDatabase();
    const batchId = uuidv4();
    const results = [];
    const errors = [];
    let rowNumber = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          rowNumber++;
          try {
            const parsedData = this.parseRow(row);
            
            const result = await db.run(`
              INSERT INTO raw_imports (
                source_file, original_row_number, raw_data, parsed_data, import_batch_id
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              sourceFileName,
              rowNumber,
              JSON.stringify(row),
              JSON.stringify(parsedData),
              batchId
            ]);

            const task = await TaskService.createTask(parsedData, result.lastID);
            
            results.push({
              rowNumber,
              taskId: task.id,
              materialId: parsedData.material_id,
              success: true
            });
          } catch (error) {
            errors.push({
              rowNumber,
              error: error.message,
              rawData: row
            });
          }
        })
        .on('end', () => {
          resolve({
            batchId,
            sourceFile: sourceFileName,
            totalRows: rowNumber,
            successCount: results.length,
            errorCount: errors.length,
            results,
            errors
          });
        })
        .on('error', reject);
    });
  }

  parseRow(row) {
    const materialId = row['素材ID'] || row['material_id'] || row['id'];
    if (!materialId) {
      throw new Error('缺少素材ID');
    }

    return {
      material_id: materialId,
      audit_result: row['审核结果'] || row['audit_result'] || null,
      cost_report: {
        date: row['日期'] || row['date'] || null,
        platform: row['平台'] || row['platform'] || null,
        spend: parseFloat(row['花费'] || row['spend'] || 0),
        impressions: parseInt(row['曝光'] || row['impressions'] || 0),
        clicks: parseInt(row['点击'] || row['clicks'] || 0)
      },
      supplier_statement: {
        supplier: row['供应商'] || row['supplier'] || null,
        amount: parseFloat(row['对账金额'] || row['statement_amount'] || 0),
        settlementDate: row['结算日期'] || row['settlement_date'] || null
      }
    };
  }

  async getRawImportById(id) {
    const db = await getDatabase();
    const record = await db.get('SELECT * FROM raw_imports WHERE id = ?', id);
    
    if (record) {
      record.raw_data = record.raw_data ? JSON.parse(record.raw_data) : null;
      record.parsed_data = record.parsed_data ? JSON.parse(record.parsed_data) : null;
    }
    
    return record;
  }

  async getImportsByBatch(batchId) {
    const db = await getDatabase();
    const records = await db.all(`
      SELECT * FROM raw_imports 
      WHERE import_batch_id = ?
      ORDER BY original_row_number ASC
    `, batchId);

    return records.map(record => ({
      ...record,
      raw_data: record.raw_data ? JSON.parse(record.raw_data) : null,
      parsed_data: record.parsed_data ? JSON.parse(record.parsed_data) : null
    }));
  }

  async getTaskRawImport(taskId) {
    const db = await getDatabase();
    const record = await db.get(`
      SELECT r.* FROM raw_imports r
      INNER JOIN task_queue t ON r.id = t.raw_import_id
      WHERE t.id = ?
    `, taskId);

    if (record) {
      record.raw_data = record.raw_data ? JSON.parse(record.raw_data) : null;
      record.parsed_data = record.parsed_data ? JSON.parse(record.parsed_data) : null;
    }

    return record;
  }
}

module.exports = new ImportService();