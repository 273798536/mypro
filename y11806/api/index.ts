import express from 'express';
import cors from 'cors';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

import {
  mockPeriods,
  mockOrders,
  mockCashFlow,
  mockPendingItems,
  mockFeeBreakdown,
} from '../src/data/mockData.js';

app.get('/api/periods', (req, res) => {
  res.json({
    success: true,
    data: mockPeriods,
  });
});

app.get('/api/orders', (req, res) => {
  const { periodId } = req.query;
  let orders = mockOrders;
  if (periodId) {
    orders = mockOrders.filter((o) => o.periodId === periodId);
  }
  res.json({
    success: true,
    data: orders,
  });
});

app.get('/api/orders/filter', (req, res) => {
  const { periodId, shopName, status } = req.query;
  let orders = mockOrders;
  if (periodId) {
    orders = orders.filter((o) => o.periodId === periodId);
  }
  if (shopName) {
    orders = orders.filter((o) =>
      o.shopName.toLowerCase().includes((shopName as string).toLowerCase())
    );
  }
  res.json({
    success: true,
    data: orders,
  });
});

app.get('/api/cashflow', (req, res) => {
  res.json({
    success: true,
    data: mockCashFlow,
  });
});

app.get('/api/pending', (req, res) => {
  res.json({
    success: true,
    data: mockPendingItems,
  });
});

app.post('/api/pending/:id/confirm', (req, res) => {
  const { id } = req.params;
  const item = mockPendingItems.find((p) => p.id === id);
  if (item) {
    item.status = 'confirmed';
  }
  res.json({
    success: true,
    data: null,
    message: '已确认',
  });
});

app.get('/api/fees/breakdown/:periodId', (req, res) => {
  const { periodId } = req.params;
  const period = mockPeriods.find((p) => p.id === periodId);
  if (!period) {
    return res.status(404).json({
      success: false,
      message: '账期不存在',
    });
  }
  res.json({
    success: true,
    data: mockFeeBreakdown(period),
  });
});

app.post('/api/fees', (req, res) => {
  const records = req.body;
  console.log('收到广告扣费补录:', records);
  res.json({
    success: true,
    data: records,
    message: '补录成功',
  });
});

app.get('/api/export', async (req, res) => {
  try {
    const { periodId, startDate, endDate } = req.query;
    const exportData = {
      periods: mockPeriods,
      orders: mockOrders,
      exportTime: new Date().toISOString(),
      filters: { periodId, startDate, endDate },
    };
    const exportDir = path.join(__dirname, '../exports');
    if (!existsSync(exportDir)) {
      await mkdir(exportDir, { recursive: true });
    }
    const fileName = `export_${Date.now()}.json`;
    const filePath = path.join(exportDir, fileName);
    await writeFile(filePath, JSON.stringify(exportData, null, 2));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '导出失败',
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
  });
});

app.listen(PORT, () => {
  console.log(`后端API服务器运行在 http://localhost:${PORT}`);
});
