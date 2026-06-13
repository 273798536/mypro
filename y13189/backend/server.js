const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  getAllReports,
  getReportById,
  recalculateWithNewParams,
  generateExportHtml
} = require('./services/reportService');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use('/mock', express.static(path.join(__dirname, 'mock-assets')));

app.get('/api/reports', (req, res) => {
  try {
    const reports = getAllReports();
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/reports/:id', (req, res) => {
  try {
    const report = getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/reports/:id/recalculate', (req, res) => {
  try {
    const { windSpeed, attackAngle } = req.body;
    const result = recalculateWithNewParams(req.params.id, {
      windSpeed: windSpeed !== undefined ? Number(windSpeed) : undefined,
      attackAngle: attackAngle !== undefined ? Number(attackAngle) : undefined
    });
    if (result.error) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/reports/:id/export', (req, res) => {
  try {
    const report = getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }
    const html = generateExportHtml(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.id}.html"`);
    res.send(html);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/reports/:id/export', (req, res) => {
  try {
    const { windSpeed, attackAngle } = req.body;
    let reportData;

    if (windSpeed !== undefined || attackAngle !== undefined) {
      const result = recalculateWithNewParams(req.params.id, {
        windSpeed: windSpeed !== undefined ? Number(windSpeed) : undefined,
        attackAngle: attackAngle !== undefined ? Number(attackAngle) : undefined
      });
      if (result.error) {
        return res.status(404).json({ success: false, error: result.error });
      }
      const originalReport = getReportById(req.params.id);
      reportData = {
        ...originalReport,
        ...result,
        samples: result.samples
      };
    } else {
      reportData = getReportById(req.params.id);
      if (!reportData) {
        return res.status(404).json({ success: false, error: '报告不存在' });
      }
    }

    const html = generateExportHtml(reportData);
    const format = req.query.format || 'html';

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="wind-tunnel-report-${Date.now()}.html"`);
      res.send(html);
    } else {
      res.json({ success: true, data: { html, format } });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '风洞烟线报告导出系统 - 后端服务运行中' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 风洞烟线报告导出系统 - 后端服务启动成功`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📋 API 列表:`);
  console.log(`   GET  /api/health            - 健康检查`);
  console.log(`   GET  /api/reports           - 获取报告列表`);
  console.log(`   GET  /api/reports/:id       - 获取报告详情`);
  console.log(`   POST /api/reports/:id/recalculate - 参数复算`);
  console.log(`   GET  /api/reports/:id/export - 导出报告（HTML）`);
  console.log(`\n`);
});
