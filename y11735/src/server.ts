import express, { Request, Response } from 'express';
import { sequelize } from './models';
import refundRouter from './routes/refund';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/refund', refundRouter);

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: '校园一卡通退款系统',
    version: '1.0.0',
    docs: {
      'GET /api/refund/health': '健康检查',
      'GET /api/refund/batches': '获取批次列表',
      'POST /api/refund/batches': '创建批次',
      'GET /api/refund/batches/:batchNo': '批次详情',
      'POST /api/refund/batches/:batchNo/import': 'CSV导入',
      'POST /api/refund/batches/:batchNo/import-json': 'JSON导入',
      'POST /api/refund/batches/:batchNo/review': '批次复核',
      'POST /api/refund/batches/:batchNo/export': '批次导出',
      'POST /api/refund/batches/:batchNo/process': '标记处理完成',
      'POST /api/refund/records/:recordNo/review': '单条记录复核',
      'PUT /api/refund/records/:recordNo/amount': '修改退款金额',
      'GET /api/refund/audit/batch/:batchNo': '批次审计日志',
      'GET /api/refund/audit/record/:recordNo': '记录审计日志',
      'GET /api/refund/audit/student/:studentId': '学生审计日志'
    }
  });
});

async function bootstrap() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

bootstrap();
