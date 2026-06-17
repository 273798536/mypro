const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

initDatabase();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
=========================================
  敏感词规则回归测试工具
=========================================
  后端服务: http://localhost:${PORT}
  API 路径: http://localhost:${PORT}/api
=========================================
  `);
});
