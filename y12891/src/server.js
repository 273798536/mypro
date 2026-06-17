const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

const batchesRouter = require('./routes/batches');
const importRouter = require('./routes/import');
const reviewRouter = require('./routes/review');
const riskRouter = require('./routes/risk');
const reportRouter = require('./routes/report');
const exportRouter = require('./routes/export');
const { resetDatabase } = require('./db/database');

app.use('/api/batches', batchesRouter);
app.use('/api/batches', importRouter);
app.use('/api/review', reviewRouter);
app.use('/api/risk', riskRouter);
app.use('/api/report', reportRouter);
app.use('/api/export', exportRouter);

function handleResetDB(req, res) {
  try {
    resetDatabase();
    res.json({ success: true, message: '数据库已重置' });
  } catch (err) {
    console.error('重置数据库失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
app.get('/api/resetdb', handleResetDB);
app.post('/api/resetdb', handleResetDB);

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', service: '港区危险品泊位检查系统' });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    service: '港区危险品泊位检查系统API',
    endpoints: {
      batches: '/api/batches (GET列表/POST新建)',
      import_materials: '/api/batches/:id/import/{buoy,tide,weather,violation,photo,aquaculture,sample}',
      materials: '/api/batches/:id/materials (GET全部材料)',
      review: '/api/review/:batchId/{summary,submit,item,buoy/:id,photos/missing,duplicates}',
      risk: '/api/risk/:batchId/{assess,latest,version/:v,compare,all}',
      report: '/api/report/:batchId/{generate,latest,version/:v,all,export}',
      export_data: '/api/export/:batchId/{json,csv,report}'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  港区危险品泊位检查系统`);
  console.log(`  服务已启动: http://localhost:${PORT}`);
  console.log(`  API文档: http://localhost:${PORT}/api`);
  console.log(`========================================`);
});

module.exports = app;
