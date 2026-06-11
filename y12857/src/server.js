const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/batches', require('./routes/batches'));
app.use('/api/import', require('./routes/import'));
app.use('/api/cleaning', require('./routes/cleaning'));
app.use('/api/export', require('./routes/export'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', service: '船舶AIS漂移清洗系统' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  船舶 AIS 漂移清洗系统已启动`);
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  Web界面:  http://localhost:${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================`);
});

module.exports = app;
