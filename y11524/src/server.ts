import express from 'express';
import path from 'path';
import fs from 'fs';
import ledgerRoutes from './routes/ledgerRoutes';
import { getDatabase } from './database/connection';

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/ledger', ledgerRoutes);

app.get('/', (req, res) => {
  res.json({
    name: '家电安装回访权限追责台账 API',
    version: '1.0.0',
    endpoints: {
      import: {
        appointment: 'POST /api/ledger/import/appointment',
        technicianLocation: 'POST /api/ledger/import/technician-location',
        userReview: 'POST /api/ledger/import/user-review',
        secondConfirmation: 'POST /api/ledger/import/second-confirmation',
      },
      status: {
        change: 'POST /api/ledger/status/change',
      },
      query: {
        list: 'GET /api/ledger/list',
        detail: 'GET /api/ledger/detail/:id',
        failedRecords: 'GET /api/ledger/failed-records',
        statistics: 'GET /api/ledger/statistics',
      },
      export: {
        batch: 'POST /api/ledger/export',
        detail: 'POST /api/ledger/export/:id',
      },
    },
  });
});

getDatabase();

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`数据库文件: ${path.join(process.cwd(), 'data', 'ledger.db')}`);
});

export default app;
