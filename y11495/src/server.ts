import express from 'express';
import routes from './routes';
import { FileUploadService } from './services/file-upload.service';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '文件过大',
        message: '文件大小不能超过 10MB',
      });
    }
    return res.status(400).json({
      success: false,
      error: '文件上传错误',
      message: err.message,
    });
  }
  
  if (err.message && err.message.includes('不支持的文件类型')) {
    return res.status(400).json({
      success: false,
      error: '文件类型错误',
      message: err.message,
    });
  }
  
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`财务报销稽核异常回执状态机 API 服务已启动`);
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`API 前缀: /api`);
  console.log('');
  console.log('预设用户:');
  console.log('  - clerk01 (财务文员)');
  console.log('  - reviewer01 (稽核员)');
  console.log('  - manager01 (财务经理)');
  console.log('  - admin01 (系统管理员)');
  console.log('');
  console.log('使用方式: 在请求头中添加 X-Username 指定用户');
  console.log('  例如: X-Username: clerk01');
  
  FileUploadService.ensureUploadDir();
});

export default app;
