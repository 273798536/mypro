const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const services = require('./src/services');
const exportService = require('./src/export');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

require('./src/db');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/annotations', async (req, res) => {
  try {
    const filters = {
      batch_no: req.query.batch_no,
      status: req.query.status,
      anomaly_type: req.query.anomaly_type
    };
    const data = await services.getAnnotationList(filters);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/annotations/:id', async (req, res) => {
  try {
    const data = await services.getAnnotationWithTrace(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/annotations', async (req, res) => {
  try {
    const result = await services.importAnnotation(req.body, req.body.operator || 'api_user');
    if (result.duplicate) {
      return res.status(409).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/annotations/batch', async (req, res) => {
  try {
    const { records, operator } = req.body;
    const results = [];
    let successCount = 0;
    let duplicateCount = 0;
    
    for (const record of records) {
      const result = await services.importAnnotation(record, operator || 'batch_import');
      results.push({ ...result, record });
      if (result.success) successCount++;
      if (result.duplicate) duplicateCount++;
    }
    
    res.json({
      success: true,
      total: records.length,
      successCount,
      duplicateCount,
      failedCount: records.length - successCount - duplicateCount,
      results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/annotations/:id/supplement', async (req, res) => {
  try {
    const result = await services.supplementAnnotation(
      req.params.id,
      req.body,
      req.body.operator || 'api_user'
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const result = await services.submitReview(req.body, req.body.reviewer || 'reviewer');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/summary', async (req, res) => {
  try {
    const data = await services.getReviewSummary();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/export/summary', async (req, res) => {
  try {
    const data = await exportService.getExportSummary(req.query.batch_no);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/export', async (req, res) => {
  try {
    const result = await exportService.exportReviewData(req.query.batch_no);
    
    const filename = `UAV_Mosaic_Review_${Date.now()}.csv`;
    const encodedFilename = encodeURIComponent('无人机航片拼接复核报告.csv');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('X-Export-Summary', encodeURIComponent(result.summaryText));
    res.setHeader('X-Export-Count', String(result.recordCount));
    res.setHeader('X-Export-Time', result.exportTime);
    
    res.send('\uFEFF' + result.csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/check-duplicate', async (req, res) => {
  try {
    const result = await services.checkDuplicate(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/trace/:id', async (req, res) => {
  try {
    const data = await services.getAnnotationWithTrace(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    res.json({ 
      success: true, 
      traceability_chain: data.traceability_chain,
      annotation: data.annotation,
      processLogs: data.processLogs,
      latestReview: data.latestReview
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   无人机航片拼接复核工具已启动                              ║
║                                                            ║
║   服务地址: http://localhost:${PORT}                         ║
║                                                            ║
║   初始化样例: npm run init-sample                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
