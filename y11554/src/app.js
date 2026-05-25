require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const db = require('./config/database');
db.connect();

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ledger', require('./routes/ledger'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/refund', require('./routes/refund'));
app.use('/api/photo', require('./routes/photo'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/export', require('./routes/export'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`智能柜补货权限追责台账服务启动于端口 ${PORT}`);
});

module.exports = app;
