import express from 'express';
import cors from 'cors';
import * as path from 'path';
import routes from './routes';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`台风避风锚地推荐系统 后端已启动: http://localhost:${PORT}`);
});
