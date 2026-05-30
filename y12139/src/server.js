const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database');
const AnalysisService = require('./analysisService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let analysisService;

async function startServer() {
  await initDatabase();
  analysisService = new AnalysisService();

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'cold-chain-defrost-analyzer',
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/analysis', async (req, res) => {
    try {
      const { cold_storage_id, raw_data, config } = req.body;

      if (!cold_storage_id) {
        return res.status(400).json({
          error: 'cold_storage_id is required'
        });
      }

      if (!raw_data) {
        return res.status(400).json({
          error: 'raw_data is required'
        });
      }

      const result = await analysisService.runAnalysis(
        cold_storage_id,
        raw_data,
        config || {}
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message
      });
    }
  });

  app.get('/api/analysis/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = await analysisService.getAnalysisSession(sessionId);

      if (!result) {
        return res.status(404).json({
          error: 'Analysis session not found'
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({
        error: 'Failed to retrieve session',
        message: error.message
      });
    }
  });

  app.get('/api/analysis', async (req, res) => {
    try {
      const { cold_storage_id, limit, offset } = req.query;
      
      const sessions = await analysisService.listSessions(
        cold_storage_id,
        parseInt(limit) || 20,
        parseInt(offset) || 0
      );

      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('List sessions error:', error);
      res.status(500).json({
        error: 'Failed to list sessions',
        message: error.message
      });
    }
  });

  app.post('/api/analysis/compare', async (req, res) => {
    try {
      const { base_session_id, modified_session_id } = req.body;

      if (!base_session_id || !modified_session_id) {
        return res.status(400).json({
          error: 'Both base_session_id and modified_session_id are required'
        });
      }

      const comparison = await analysisService.compareSessions(
        base_session_id,
        modified_session_id
      );

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Comparison error:', error);
      res.status(500).json({
        error: 'Comparison failed',
        message: error.message
      });
    }
  });

  app.get('/api/anomalies/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { type, severity } = req.query;
      
      const session = await analysisService.getAnalysisSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      let anomalies = session.anomalies || [];
      
      if (type) {
        anomalies = anomalies.filter(a => a.anomaly_type === type);
      }
      if (severity) {
        anomalies = anomalies.filter(a => a.severity === severity);
      }

      res.json({
        success: true,
        data: anomalies
      });
    } catch (error) {
      console.error('Get anomalies error:', error);
      res.status(500).json({
        error: 'Failed to retrieve anomalies',
        message: error.message
      });
    }
  });

  app.get('/api/heat-load/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await analysisService.getAnalysisSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        success: true,
        data: session.heat_load || {}
      });
    } catch (error) {
      console.error('Get heat load error:', error);
      res.status(500).json({
        error: 'Failed to retrieve heat load data',
        message: error.message
      });
    }
  });

  app.get('/api/energy/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await analysisService.getAnalysisSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        success: true,
        data: session.energy || {}
      });
    } catch (error) {
      console.error('Get energy error:', error);
      res.status(500).json({
        error: 'Failed to retrieve energy data',
        message: error.message
      });
    }
  });

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  });

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   冷链融霜能耗分析服务 v1.0.0                                 ║
║   Cold Chain Defrost Energy Analysis Service                  ║
║                                                               ║
║   服务地址: http://localhost:${PORT}                            ║
║   健康检查: http://localhost:${PORT}/health                     ║
║                                                               ║
║   API 端点:                                                   ║
║   POST   /api/analysis          - 提交分析任务                ║
║   GET    /api/analysis/:id      - 获取分析结果                ║
║   GET    /api/analysis          - 列出分析会话                ║
║   POST   /api/analysis/compare  - 对比两个会话                ║
║   GET    /api/anomalies/:id     - 获取异常列表                ║
║   GET    /api/heat-load/:id     - 获取热负荷分析              ║
║   GET    /api/energy/:id        - 获取能耗统计                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);
