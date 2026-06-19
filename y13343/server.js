const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const service = require('./src/service');
const { loadMetadata } = require('./src/storage');

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/samples', express.static(path.join(__dirname, 'samples')));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'schedule-misjudgment-replay',
    modelVersion: service.MODEL_VERSION,
    oldModelVersion: service.OLD_MODEL_VERSION,
    dataPath: path.join(__dirname, 'data')
  });
});

app.get('/api/stats', (req, res) => {
  res.json(service.getStatistics());
});

app.get('/api/consistency', (req, res) => {
  res.json(service.checkConsistency());
});

app.get('/api/records', (req, res) => {
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.batchId) filters.batchId = req.query.batchId;
  if (req.query.needsConfirm === '1' || req.query.needsConfirm === 'true') filters.needsConfirm = true;
  res.json(service.getAllRecords(filters));
});

app.get('/api/records/:id', (req, res) => {
  const detail = service.getRecordDetail(req.params.id);
  if (!detail) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json(detail);
});

app.post('/api/records/import', (req, res) => {
  try {
    const operator = req.body.operator || req.header('X-Operator') || 'import_api';
    const data = req.body.data || req.body.records || req.body;
    const result = service.importBatch(data, operator);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.post('/api/records/:id/confirm', (req, res) => {
  try {
    const operator = (req.body && req.body.operator) || req.header('X-Operator') || 'manual';
    const remark = (req.body && req.body.remark) || '';
    const record = service.confirmRecord(req.params.id, operator, remark);
    res.json({ success: true, record });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.post('/api/records/:id/withdraw', (req, res) => {
  try {
    const operator = (req.body && req.body.operator) || req.header('X-Operator') || 'manual';
    const remark = (req.body && req.body.remark) || '';
    const record = service.withdrawRecord(req.params.id, operator, remark);
    res.json({ success: true, record });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.post('/api/records/:id/remark', (req, res) => {
  try {
    const operator = (req.body && req.body.operator) || req.header('X-Operator') || 'manual';
    const remark = (req.body && req.body.remark) || '';
    const record = service.updateRemark(req.params.id, operator, remark);
    res.json({ success: true, record });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.get('/api/records/:id/replay', (req, res) => {
  const detail = service.getRecordDetail(req.params.id);
  if (!detail) {
    return res.status(404).json({ error: '记录不存在' });
  }
  const reclass = service.explainReclassification(detail.record);
  const confirmInfo = service.needsManualConfirm(detail.record);
  res.json({
    record: detail.record,
    reclassification: reclass,
    manualConfirm: confirmInfo,
    history: detail.history,
    exceptions: detail.exceptions
  });
});

app.get('/api/exceptions', (req, res) => {
  let resolved;
  if (req.query.resolved === '1' || req.query.resolved === 'true') resolved = true;
  if (req.query.resolved === '0' || req.query.resolved === 'false') resolved = false;
  res.json(service.getExceptions(resolved));
});

app.post('/api/exceptions/:id/resolve', (req, res) => {
  try {
    const operator = (req.body && req.body.operator) || req.header('X-Operator') || 'manual';
    const remark = (req.body && req.body.remark) || '';
    const exc = service.resolveException(req.params.id, operator, remark);
    res.json({ success: true, exception: exc });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.get('/api/metadata', (req, res) => {
  res.json(loadMetadata());
});

app.get('/api/samples/list', (req, res) => {
  const dir = path.join(__dirname, 'samples');
  if (!fs.existsSync(dir)) {
    return res.json([]);
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  res.json(files);
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n========== 排班推荐误判回放系统 ==========`);
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  数据目录: ${path.join(__dirname, 'data')}`);
  console.log(`  样本目录: ${path.join(__dirname, 'samples')}`);
  console.log(`  API文档:`);
  console.log(`    GET  /api/health                 健康检查`);
  console.log(`    GET  /api/stats                  统计概览`);
  console.log(`    GET  /api/consistency            一致性校验`);
  console.log(`    GET  /api/records                记录列表（?status=pending&needsConfirm=true）`);
  console.log(`    GET  /api/records/:id            记录详情`);
  console.log(`    GET  /api/records/:id/replay     误判回放（含改判解释）`);
  console.log(`    POST /api/records/import         批量导入`);
  console.log(`    POST /api/records/:id/confirm    确认`);
  console.log(`    POST /api/records/:id/withdraw   撤回`);
  console.log(`    POST /api/records/:id/remark     更新备注`);
  console.log(`    GET  /api/exceptions             异常队列（?resolved=false）`);
  console.log(`    POST /api/exceptions/:id/resolve 标记异常已解决`);
  console.log(`============================================\n`);
});
