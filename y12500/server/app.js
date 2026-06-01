const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config.json');
const { initDB } = require('./models/database');

const warehouseRoutes = require('./routes/warehouse');
const inspectionRoutes = require('./routes/inspection');

const app = express();

initDB();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/warehouse', warehouseRoutes);
app.use('/api/inspection', inspectionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    config: {
      warehouse: config.warehouse,
      validation: config.validation
    }
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      warehouse: config.warehouse,
      validation: config.validation
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: err.message
  });
});

const PORT = process.env.PORT || config.server.port;
app.listen(PORT, () => {
  console.log(`\n🚀 仓库无人机巡检3D工作台已启动`);
  console.log(`📍 服务地址: http://${config.server.host}:${PORT}`);
  console.log(`📁 数据存储: ${config.database.path}\n`);
});

module.exports = app;
