const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const waveRoutes = require('./routes/waves');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      message: '仓内波次缺货回补核算服务运行正常',
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/waves', waveRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '接口不存在'
    }
  });
});

app.use(errorHandler);

module.exports = app;
