const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ImportService = require('../services/importService');
const { SOURCE_TYPES } = require('../constants');

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('只支持 CSV 格式文件'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.get('/sources', async (req, res) => {
  try {
    const { sourceType, page, pageSize } = req.query;
    const result = await ImportService.getImportSources(
      sourceType,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/source-types', (req, res) => {
  res.json({
    success: true,
    data: SOURCE_TYPES
  });
});

const importHandlers = {
  [SOURCE_TYPES.SAMPLE_LABEL]: ImportService.importSampleLabels.bind(ImportService),
  [SOURCE_TYPES.TEMPERATURE_RECORD]: ImportService.importTemperatureRecords.bind(ImportService),
  [SOURCE_TYPES.STORE_COMPLAINT]: ImportService.importStoreComplaints.bind(ImportService),
  [SOURCE_TYPES.REFUND_RECORD]: ImportService.importRefundRecords.bind(ImportService),
  [SOURCE_TYPES.INVENTORY_DIFFERENCE]: ImportService.importInventoryDifferences.bind(ImportService)
};

router.post('/upload/:sourceType', upload.single('file'), async (req, res) => {
  try {
    const { sourceType } = req.params;
    const handler = importHandlers[sourceType];

    if (!handler) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: `不支持的导入类型: ${sourceType}`,
        supportedTypes: Object.values(SOURCE_TYPES)
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传 CSV 文件'
      });
    }

    const result = await handler(
      req.file.path,
      req.file.originalname,
      req.headers['x-operator-id']
    );

    res.json({
      success: true,
      data: {
        importSource: result.importSource,
        successCount: result.successCount,
        failedCount: result.failedCount,
        totalCount: result.totalCount,
        results: result.results.slice(0, 100)
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/direct/:sourceType', async (req, res) => {
  try {
    const { sourceType } = req.params;
    const { records, sourceName } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'records 必须是数组'
      });
    }

    const importSource = await ImportService.createImportSource(
      sourceType,
      'direct_api',
      sourceName || `API导入_${Date.now()}`,
      req.headers['x-operator-id']
    );

    let successCount = 0;
    let failedCount = 0;
    const results = [];
    const db = require('../config/database');

    const tableMap = {
      [SOURCE_TYPES.SAMPLE_LABEL]: 'sample_labels',
      [SOURCE_TYPES.TEMPERATURE_RECORD]: 'temperature_records',
      [SOURCE_TYPES.STORE_COMPLAINT]: 'store_complaints',
      [SOURCE_TYPES.REFUND_RECORD]: 'refund_records',
      [SOURCE_TYPES.INVENTORY_DIFFERENCE]: 'inventory_differences'
    };

    const tableName = tableMap[sourceType];
    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: `不支持的导入类型: ${sourceType}`
      });
    }

    const { v4: uuidv4 } = require('uuid');

    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        const rawData = JSON.stringify(record);

        const item = {
          id: uuidv4(),
          import_source_id: importSource.id,
          source_line_number: i + 1,
          source_raw_data: rawData,
          created_by: req.headers['x-operator-id'],
          updated_by: req.headers['x-operator-id'],
          ...record
        };

        await db(tableName).insert(item);
        successCount++;
        results.push({ lineNumber: i + 1, success: true, id: item.id });
      } catch (error) {
        failedCount++;
        results.push({ lineNumber: i + 1, success: false, error: error.message });
      }
    }

    await ImportService.updateImportSource(importSource.id, {
      total_rows: records.length,
      success_rows: successCount,
      failed_rows: failedCount,
      status: failedCount === 0 ? 'completed' : successCount > 0 ? 'partial' : 'failed'
    });

    res.json({
      success: true,
      data: {
        importSource: {
          ...importSource,
          total_rows: records.length,
          success_rows: successCount,
          failed_rows: failedCount
        },
        successCount,
        failedCount,
        totalCount: records.length,
        results: results.slice(0, 100)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/append/:sourceType', async (req, res) => {
  try {
    const { sourceType } = req.params;
    const { records, sourceName, importSourceId } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'records 必须是数组'
      });
    }

    const db = require('../config/database');
    const { v4: uuidv4 } = require('uuid');

    let importSource;
    if (importSourceId) {
      importSource = await db('import_sources').where({ id: importSourceId }).first();
      if (!importSource) {
        return res.status(404).json({
          success: false,
          error: '导入源不存在'
        });
      }
    } else {
      importSource = await ImportService.createImportSource(
        sourceType,
        'append_api',
        sourceName || `追加导入_${Date.now()}`,
        req.headers['x-operator-id']
      );
    }

    const tableMap = {
      [SOURCE_TYPES.SAMPLE_LABEL]: 'sample_labels',
      [SOURCE_TYPES.TEMPERATURE_RECORD]: 'temperature_records',
      [SOURCE_TYPES.STORE_COMPLAINT]: 'store_complaints',
      [SOURCE_TYPES.REFUND_RECORD]: 'refund_records',
      [SOURCE_TYPES.INVENTORY_DIFFERENCE]: 'inventory_differences'
    };

    const tableName = tableMap[sourceType];
    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: `不支持的导入类型: ${sourceType}`
      });
    }

    const currentMaxLine = await db(tableName)
      .where('import_source_id', importSource.id)
      .max('source_line_number as maxLine')
      .first()
      .then(r => r.maxLine || 0);

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        const rawData = JSON.stringify(record);

        const item = {
          id: uuidv4(),
          import_source_id: importSource.id,
          source_line_number: currentMaxLine + i + 1,
          source_raw_data: rawData,
          created_by: req.headers['x-operator-id'],
          updated_by: req.headers['x-operator-id'],
          ...record
        };

        await db(tableName).insert(item);
        successCount++;
        results.push({ lineNumber: currentMaxLine + i + 1, success: true, id: item.id });
      } catch (error) {
        failedCount++;
        results.push({ lineNumber: currentMaxLine + i + 1, success: false, error: error.message });
      }
    }

    const updatedSource = await db('import_sources').where({ id: importSource.id }).first();
    await ImportService.updateImportSource(importSource.id, {
      total_rows: (updatedSource.total_rows || 0) + records.length,
      success_rows: (updatedSource.success_rows || 0) + successCount,
      failed_rows: (updatedSource.failed_rows || 0) + failedCount,
      status: ((updatedSource.failed_rows || 0) + failedCount) === 0 ? 'completed' :
              ((updatedSource.success_rows || 0) + successCount) > 0 ? 'partial' : 'failed'
    });

    res.json({
      success: true,
      data: {
        importSourceId: importSource.id,
        isAppend: !!importSourceId,
        startLineNumber: currentMaxLine + 1,
        successCount,
        failedCount,
        totalAppended: records.length,
        results: results.slice(0, 100)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: `文件上传错误: ${err.message}`
    });
  }
  res.status(500).json({
    success: false,
    error: err.message
  });
});

module.exports = router;
