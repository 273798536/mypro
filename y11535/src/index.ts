import 'reflect-metadata';
import * as express from 'express';
import { json, urlencoded } from 'express';
import { AppDataSource } from './database/data-source';
import batchRoutes from './routes/batches';
import exceptionRoutes from './routes/exceptions';
import reportRoutes from './routes/reports';
import auditRoutes from './routes/audit';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(json());
app.use(urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/batches', batchRoutes);
app.use('/api/exceptions', exceptionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message
  });
});

AppDataSource.initialize()
  .then(() => {
    console.log('Database connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to database:', error);
    process.exit(1);
  });
