import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const SEED_PATH = path.join(__dirname, 'data', 'seed.json');
const PORT = process.env.PORT || 4000;

if (!fs.existsSync(DB_PATH)) {
  fs.copyFileSync(SEED_PATH, DB_PATH);
}

const resetDBFromSeed = () => fs.copyFileSync(SEED_PATH, DB_PATH);

const app = express();
app.use(cors());
app.use(express.json());

const readDB = () => {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
};

const writeDB = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const getClientIp = (req) => {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: nowStr() });
});

app.get('/api/students', (_req, res) => {
  const { students } = readDB();
  res.json(students);
});

app.get('/api/packages', (_req, res) => {
  const { packages } = readDB();
  res.json(packages);
});

app.get('/api/leaves', (_req, res) => {
  const { leaves } = readDB();
  res.json(leaves);
});

app.get('/api/evaluations', (_req, res) => {
  const { evaluations } = readDB();
  res.json(evaluations);
});

app.get('/api/alerts', (_req, res) => {
  const { alerts } = readDB();
  res.json(alerts);
});

app.put('/api/alerts/:id', (req, res) => {
  const db = readDB();
  const idx = db.alerts.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });

  const before = { ...db.alerts[idx] };
  const after = { ...db.alerts[idx], ...req.body, updateTime: nowStr() };
  db.alerts[idx] = after;

  const log = {
    id: `log${Date.now()}`,
    operator: req.body.handler || 'unknown',
    operateTime: nowStr(),
    action: '更新续费预测',
    targetId: after.id,
    targetType: 'renewalAlert',
    beforeData: {
      processStatus: before.processStatus,
      handler: before.handler,
    },
    afterData: {
      processStatus: after.processStatus,
      handler: after.handler,
    },
    ip: getClientIp(req),
  };
  db.logs = [log, ...db.logs];

  writeDB(db);
  res.json({ alert: after, log });
});

app.get('/api/logs', (_req, res) => {
  const { logs } = readDB();
  res.json(logs);
});

app.post('/api/logs', (req, res) => {
  const db = readDB();
  const log = {
    ...req.body,
    id: `log${Date.now()}`,
    operateTime: nowStr(),
    ip: getClientIp(req),
  };
  db.logs = [log, ...db.logs];
  writeDB(db);
  res.status(201).json(log);
});

app.post('/api/reset', (_req, res) => {
  resetDBFromSeed();
  const db = readDB();
  res.json({ ok: true, resetAt: nowStr(), counts: {
    students: db.students.length,
    alerts: db.alerts.length,
    logs: db.logs.length,
  }});
});

app.listen(PORT, () => {
  console.log(`[renewal-server] listening on http://localhost:${PORT}`);
  console.log(`[renewal-server] db   at ${DB_PATH}`);
});
