import express from 'express';
import { initDb, closeDb } from './db/init';
import walletRouter from './modules/wallet';
import transferRouter from './modules/transfer';
import exchangeRouter from './modules/exchange';
import priceRouter from './modules/price';
import gasRouter from './modules/gas';
import reportRouter from './modules/report';

const app = express();
const PORT = parseInt(process.env.PORT || '3200', 10);

app.use(express.json());

app.use('/api/wallets', walletRouter);
app.use('/api/transfers', transferRouter);
app.use('/api/exchange-bills', exchangeRouter);
app.use('/api/prices', priceRouter);
app.use('/api/gas-fees', gasRouter);
app.use('/api/reports', reportRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'crypto-custody-report' });
});

function main() {
  initDb();
  console.log('[DB] SQLite 数据库已初始化: data/custody.db');

  app.listen(PORT, () => {
    console.log(`[SERVER] 加密资产托管月报服务已启动: http://localhost:${PORT}`);
    console.log(`[API]   健康检查: http://localhost:${PORT}/api/health`);
    console.log(`[API]   钱包地址: http://localhost:${PORT}/api/wallets`);
    console.log(`[API]   链上转账: http://localhost:${PORT}/api/transfers`);
    console.log(`[API]   交易所账单: http://localhost:${PORT}/api/exchange-bills`);
    console.log(`[API]   币价快照: http://localhost:${PORT}/api/prices`);
    console.log(`[API]   Gas费: http://localhost:${PORT}/api/gas-fees`);
    console.log(`[API]   月报: http://localhost:${PORT}/api/reports`);
  });

  process.on('SIGINT', () => {
    closeDb();
    console.log('\n[DB] 数据库连接已关闭');
    process.exit(0);
  });
}

main();
