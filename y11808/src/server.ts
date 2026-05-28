import express from 'express';
import prepaymentRoutes from './routes/prepaymentRoutes';
import operationRoutes from './routes/operationRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/prepayment', prepaymentRoutes);
app.use('/api/operations', operationRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'supply-chain-prepayment-verification',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`供应链预付款核销服务启动成功!`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`========================================\n`);
  console.log(`API 接口列表:`);
  console.log(`GET  /api/prepayment/flows - 获取预付款流水列表`);
  console.log(`GET  /api/prepayment/flows/:id - 获取预付款流水详情`);
  console.log(`GET  /api/prepayment/flows/:id/summary - 获取核销汇总`);
  console.log(`GET  /api/prepayment/flows/:id/invoices - 获取发票列表`);
  console.log(`GET  /api/prepayment/flows/:id/receipts - 获取入库单列表`);
  console.log(`GET  /api/prepayment/flows/:id/verifications - 获取核销记录`);
  console.log(`GET  /api/prepayment/flows/:id/penalties - 获取扣罚记录`);
  console.log(`GET  /api/prepayment/flows/:id/ledgers - 获取预付款账本`);
  console.log(``);
  console.log(`POST /api/operations/verify - 执行核销`);
  console.log(`POST /api/operations/verify/:id/reverse - 冲销核销`);
  console.log(`POST /api/operations/red-flush - 发票红冲`);
  console.log(`POST /api/operations/split-warehouse - 入库单拆分`);
  console.log(`POST /api/operations/penalty - 扣罚处理`);
  console.log(`\n`);
});
