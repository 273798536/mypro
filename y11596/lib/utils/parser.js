const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const DATA_TYPES = {
  CHANGE_ORDER: 'change_order',
  REVIEW_OPINION: 'review_opinion',
  CITATION_RECORD: 'citation_record',
  SCAN_DETAIL: 'scan_detail'
};

const TYPE_CONFIG = {
  [DATA_TYPES.CHANGE_ORDER]: {
    name: '变更单',
    requiredFields: ['change_id', 'title', 'status', 'creator', 'created_at'],
    idField: 'change_id'
  },
  [DATA_TYPES.REVIEW_OPINION]: {
    name: '审核意见',
    requiredFields: ['review_id', 'change_id', 'reviewer', 'opinion', 'status', 'created_at'],
    idField: 'review_id'
  },
  [DATA_TYPES.CITATION_RECORD]: {
    name: '客服引用记录',
    requiredFields: ['citation_id', 'answer_id', 'agent_id', 'used_at', 'conversation_id'],
    idField: 'citation_id'
  },
  [DATA_TYPES.SCAN_DETAIL]: {
    name: '扫码明细',
    requiredFields: ['scan_id', 'answer_id', 'user_id', 'scanned_at', 'channel'],
    idField: 'scan_id'
  }
};

function detectDataType(headers) {
  const headerSet = new Set(headers.map(h => h.trim().toLowerCase()));
  
  for (const [type, config] of Object.entries(TYPE_CONFIG)) {
    const requiredLower = config.requiredFields.map(f => f.toLowerCase());
    if (requiredLower.every(f => headerSet.has(f))) {
      return type;
    }
  }
  return null;
}

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    let rowIndex = 0;
    let headers = [];

    fs.createReadStream(filePath, 'utf8')
      .pipe(csv())
      .on('headers', (headerList) => {
        headers = headerList;
      })
      .on('data', (data) => {
        rowIndex++;
        try {
          results.push({
            rowNumber: rowIndex + 1,
            rawData: { ...data },
            parsedData: normalizeFields(data),
            source: {
              file: path.basename(filePath),
              filePath,
              rowIndex,
              rowNumber: rowIndex + 1
            }
          });
        } catch (e) {
          errors.push({
            rowNumber: rowIndex + 1,
            error: e.message,
            rawData: data
          });
        }
      })
      .on('end', () => {
        resolve({
          headers,
          records: results,
          errors,
          totalRows: rowIndex,
          successCount: results.length,
          errorCount: errors.length
        });
      })
      .on('error', reject);
  });
}

function normalizeFields(data) {
  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    const newKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    normalized[newKey] = value?.trim?.() ?? value;
  }
  return normalized;
}

function validateRecord(record, dataType) {
  const config = TYPE_CONFIG[dataType];
  if (!config) {
    return { valid: false, errors: ['未知数据类型'] };
  }

  const errors = [];
  const data = record.parsedData;

  for (const field of config.requiredFields) {
    if (!data[field] || data[field] === '') {
      errors.push(`缺少必填字段: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    recordId: data[config.idField]
  };
}

function parseJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  const records = Array.isArray(data) ? data : [data];
  
  return {
    headers: Object.keys(records[0] || {}),
    records: records.map((item, index) => ({
      rowNumber: index + 1,
      rawData: { ...item },
      parsedData: normalizeFields(item),
      source: {
        file: path.basename(filePath),
        filePath,
        rowIndex: index,
        rowNumber: index + 1
      }
    })),
    errors: [],
    totalRows: records.length,
    successCount: records.length,
    errorCount: 0
  };
}

module.exports = {
  DATA_TYPES,
  TYPE_CONFIG,
  detectDataType,
  parseCSV,
  parseJSON,
  validateRecord,
  normalizeFields
};
