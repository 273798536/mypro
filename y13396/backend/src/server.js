const express = require('express');
const cors = require('cors');
const snapshotRoutes = require('./routes/snapshotRoutes');
const versionRoutes = require('./routes/versionRoutes');
const csvRoutes = require('./routes/csvRoutes');
const { initializeData } = require('./store/dataStore');

const app = express();
const PORT = 4000;

initializeData();

app.use(cors());
app.use(express.json());

app.use('/api/snapshots', snapshotRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/csv', csvRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '影子流量版本快照服务运行正常' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
