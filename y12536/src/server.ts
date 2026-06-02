import express from 'express';
import { MarkovChain } from './core/markov-chain';
import { DataStore } from './data/data-store';
import { generateSampleData } from './data/sample-data';
import { StrategyEngine } from './strategy/strategy-engine';
import { ReportGenerator } from './reporting/report-generator';
import * as path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '1.0.0';
const SOURCE = 'markov-churn-server';

app.use(express.json());

const markovChain = new MarkovChain(42, VERSION, SOURCE);
const dataStore = new DataStore(VERSION, SOURCE);
const strategyEngine = new StrategyEngine(dataStore, markovChain, VERSION, SOURCE);
const reportGenerator = new ReportGenerator(markovChain, undefined, VERSION, SOURCE);

generateSampleData(dataStore, 200, 42);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: VERSION,
    source: SOURCE,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/members', (req, res) => {
  const members = dataStore.getAllMembers();
  res.json({
    total: members.length,
    data: members,
    version: VERSION,
    source: SOURCE,
  });
});

app.get('/api/members/status-distribution', (req, res) => {
  const distribution = dataStore.calculateStatusDistribution();
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const percentages = Object.entries(distribution).map(([status, count]) => ({
    status,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));

  res.json({
    total,
    distribution: percentages,
    version: VERSION,
    source: SOURCE,
  });
});

app.get('/api/strategies', (req, res) => {
  const strategies = dataStore.getAllStrategies();
  res.json({
    total: strategies.length,
    data: strategies,
    version: VERSION,
    source: SOURCE,
  });
});

app.post('/api/strategies/run', (req, res) => {
  const executed = strategyEngine.runAllStrategies();
  res.json({
    executedCount: executed.length,
    data: executed,
    version: VERSION,
    source: SOURCE,
  });
});

app.get('/api/markov/transition-matrix', (req, res) => {
  const statusHistory = dataStore.getAllStatusHistory();
  const matrix = markovChain.calculateTransitionMatrix(statusHistory);

  res.json({
    data: matrix,
    version: VERSION,
    source: SOURCE,
  });
});

app.post('/api/markov/predict', (req, res) => {
  const { periods = 30, seed = 42 } = req.body;

  const statusHistory = dataStore.getAllStatusHistory();
  const matrix = markovChain.calculateTransitionMatrix(statusHistory);
  const initialDistribution = dataStore.getCurrentDistribution();

  const config = {
    seed,
    periods,
    initialDistribution,
    version: VERSION,
    source: SOURCE,
  };

  const prediction = markovChain.predict(matrix, config);

  res.json({
    data: prediction,
    version: VERSION,
    source: SOURCE,
  });
});

app.get('/api/strategy-comparison', (req, res) => {
  const statusHistory = dataStore.getAllStatusHistory();
  const matrix = markovChain.calculateTransitionMatrix(statusHistory);
  const strategies = dataStore.getAllStrategies();

  const steadyState = markovChain.calculateSteadyState(matrix.matrix);
  const churnedIdx = markovChain.getStates().indexOf('churned');
  const baselineRetention = 1 - steadyState[churnedIdx];

  const comparison = strategyEngine.compareStrategies(
    matrix,
    strategies,
    baselineRetention,
    1000,
    500
  );

  res.json({
    baselineRetention,
    data: comparison,
    version: VERSION,
    source: SOURCE,
  });
});

app.post('/api/reports/generate', (req, res) => {
  const {
    title = '会员流失预测报告',
    periods = 30,
    seed = 42,
    format = 'html',
  } = req.body;

  const statusHistory = dataStore.getAllStatusHistory();
  const matrix = markovChain.calculateTransitionMatrix(statusHistory);
  const initialDistribution = dataStore.getCurrentDistribution();

  const predictionConfig = {
    seed,
    periods,
    initialDistribution,
    version: VERSION,
    source: SOURCE,
  };

  const prediction = markovChain.predict(matrix, predictionConfig);

  const strategies = dataStore.getAllStrategies();
  const steadyState = markovChain.calculateSteadyState(matrix.matrix);
  const churnedIdx = markovChain.getStates().indexOf('churned');
  const baselineRetention = 1 - steadyState[churnedIdx];

  const comparison = strategyEngine.compareStrategies(
    matrix,
    strategies,
    baselineRetention,
    1000,
    500
  );

  const reportConfig = {
    title,
    includeCharts: true,
    includeRawData: true,
    format: format as 'html' | 'json' | 'pdf',
    version: VERSION,
    source: SOURCE,
  };

  const report = reportGenerator.generateReport(prediction, comparison, reportConfig);

  res.json({
    data: report,
    version: VERSION,
    source: SOURCE,
  });
});

app.get('/api/reports', (req, res) => {
  const history = reportGenerator.getReportHistory();
  res.json({
    total: history.length,
    data: history,
    version: VERSION,
    source: SOURCE,
  });
});

app.get('/api/reports/:id', (req, res) => {
  const report = reportGenerator.getReportById(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json({
    data: report,
    version: VERSION,
    source: SOURCE,
  });
});

app.get('/api/touch-records', (req, res) => {
  const records = dataStore.getAllTouchRecords();
  res.json({
    total: records.length,
    data: records,
    version: VERSION,
    source: SOURCE,
  });
});

app.get('/api/renewals', (req, res) => {
  const records = dataStore.getAllRenewals();
  res.json({
    total: records.length,
    data: records,
    version: VERSION,
    source: SOURCE,
  });
});

app.get('/', (req, res) => {
  const dashboardHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>马尔可夫客户流失预测系统</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; min-height: 100vh; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px 40px; }
        .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px; }
        .card { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; margin-bottom: 24px; }
        .card h2 { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #1a202c; display: flex; align-items: center; }
        .card h2::before { content: ''; width: 4px; height: 20px; background: #667eea; margin-right: 12px; border-radius: 2px; }
        .btn { display: inline-flex; align-items: center; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
        .btn-secondary { background: #f7fafc; color: #4a5568; }
        .btn-secondary:hover { background: #edf2f7; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .stat-card { background: #f7fafc; border-radius: 8px; padding: 20px; border-left: 4px solid #667eea; }
        .stat-card .label { font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .stat-card .value { font-size: 28px; font-weight: 700; color: #2d3748; }
        .api-list { display: grid; gap: 12px; }
        .api-item { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #f7fafc; border-radius: 8px; }
        .api-item .endpoint { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; }
        .api-item .method { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-right: 12px; }
        .method.get { background: #c6f6d5; color: #22543d; }
        .method.post { background: #bee3f8; color: #2a4365; }
        .links { display: flex; gap: 12px; flex-wrap: wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 马尔可夫客户流失预测系统</h1>
        <p>基于马尔可夫链的会员留存分析与触达策略优化平台</p>
    </div>
    <div class="container">
        <div class="card">
            <h2>系统状态</h2>
            <div class="grid">
                <div class="stat-card">
                    <div class="label">版本</div>
                    <div class="value" style="font-size: 18px;">${VERSION}</div>
                </div>
                <div class="stat-card">
                    <div class="label">数据源</div>
                    <div class="value" style="font-size: 18px;">${SOURCE}</div>
                </div>
                <div class="stat-card">
                    <div class="label">运行端口</div>
                    <div class="value" style="font-size: 18px;">${PORT}</div>
                </div>
                <div class="stat-card">
                    <div class="label">随机种子</div>
                    <div class="value" style="font-size: 18px;">42</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>快速操作</h2>
            <div class="links">
                <button class="btn" onclick="generateReport()">📄 生成预测报告</button>
                <button class="btn btn-secondary" onclick="runStrategies()">▶️ 执行触达策略</button>
                <button class="btn btn-secondary" onclick="viewMatrix()">📊 查看转移矩阵</button>
                <button class="btn btn-secondary" onclick="viewComparison()">⚖️ 策略比较</button>
            </div>
        </div>

        <div class="card">
            <h2>API 接口</h2>
            <div class="api-list">
                <div class="api-item">
                    <span class="endpoint"><span class="method get">GET</span>/api/health - 健康检查</span>
                    <a href="/api/health" class="btn-secondary btn" style="padding: 8px 16px; font-size: 12px;">调用</a>
                </div>
                <div class="api-item">
                    <span class="endpoint"><span class="method get">GET</span>/api/members - 会员列表</span>
                    <a href="/api/members" class="btn-secondary btn" style="padding: 8px 16px; font-size: 12px;">调用</a>
                </div>
                <div class="api-item">
                    <span class="endpoint"><span class="method get">GET</span>/api/members/status-distribution - 状态分布</span>
                    <a href="/api/members/status-distribution" class="btn-secondary btn" style="padding: 8px 16px; font-size: 12px;">调用</a>
                </div>
                <div class="api-item">
                    <span class="endpoint"><span class="method get">GET</span>/api/strategies - 策略列表</span>
                    <a href="/api/strategies" class="btn-secondary btn" style="padding: 8px 16px; font-size: 12px;">调用</a>
                </div>
                <div class="api-item">
                    <span class="endpoint"><span class="method get">GET</span>/api/markov/transition-matrix - 转移矩阵</span>
                    <a href="/api/markov/transition-matrix" class="btn-secondary btn" style="padding: 8px 16px; font-size: 12px;">调用</a>
                </div>
                <div class="api-item">
                    <span class="endpoint"><span class="method get">GET</span>/api/strategy-comparison - 策略比较</span>
                    <a href="/api/strategy-comparison" class="btn-secondary btn" style="padding: 8px 16px; font-size: 12px;">调用</a>
                </div>
                <div class="api-item">
                    <span class="endpoint"><span class="method get">GET</span>/api/reports - 报告历史</span>
                    <a href="/api/reports" class="btn-secondary btn" style="padding: 8px 16px; font-size: 12px;">调用</a>
                </div>
                <div class="api-item">
                    <span class="endpoint"><span class="method get">GET</span>/api/touch-records - 触达记录</span>
                    <a href="/api/touch-records" class="btn-secondary btn" style="padding: 8px 16px; font-size: 12px;">调用</a>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>核心特性</h2>
            <ul style="list-style: none; display: grid; gap: 12px;">
                <li style="padding: 12px; background: #f7fafc; border-radius: 8px;">🎯 <strong>可复算性:</strong> 使用 seedrandom 确保同样输入重跑结果一致</li>
                <li style="padding: 12px; background: #f7fafc; border-radius: 8px;">✅ <strong>参数验证:</strong> 异常参数自动检测并给出解释建议</li>
                <li style="padding: 12px; background: #f7fafc; border-radius: 8px;">📈 <strong>策略比较:</strong> 多维度 ROI 分析，自动推荐最优策略</li>
                <li style="padding: 12px; background: #f7fafc; border-radius: 8px;">📄 <strong>报告导出:</strong> HTML/JSON 格式，历史版本可追溯</li>
                <li style="padding: 12px; background: #f7fafc; border-radius: 8px;">🔗 <strong>来源追踪:</strong> 所有数据保留 version 和 source 字段</li>
                <li style="padding: 12px; background: #f7fafc; border-radius: 8px;">🔔 <strong>多渠道触达:</strong> 邮件/短信/推送/微信/电话/弹窗，不只是弹窗</li>
            </ul>
        </div>
    </div>
    <script>
        async function generateReport() {
            const res = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: '会员流失预测报告', periods: 30, seed: 42, format: 'html' })
            });
            const data = await res.json();
            alert('报告已生成！报告ID: ' + data.data.id.substring(0, 8) + '...\\n请查看 reports 目录');
            console.log('Report generated:', data);
        }

        async function runStrategies() {
            const res = await fetch('/api/strategies/run', { method: 'POST' });
            const data = await res.json();
            alert('策略执行完成！共触达 ' + data.executedCount + ' 名用户');
            console.log('Strategies executed:', data);
        }

        function viewMatrix() {
            window.location.href = '/api/markov/transition-matrix';
        }

        function viewComparison() {
            window.location.href = '/api/strategy-comparison';
        }
    </script>
</body>
</html>`;
  res.send(dashboardHtml);
});

app.listen(PORT, () => {
  console.log(`
🚀 马尔可夫客户流失预测系统已启动
📍 地址: http://localhost:${PORT}
📊 版本: ${VERSION}
🔢 随机种子: 42 (可复算)

核心功能:
  • 马尔可夫链状态转移分析
  • 多渠道触达策略引擎
  • 策略 ROI 比较分析
  • 可复算预测报告导出

API 接口:
  GET  /api/health - 健康检查
  GET  /api/members - 会员列表
  GET  /api/markov/transition-matrix - 转移矩阵
  GET  /api/strategy-comparison - 策略比较
  POST /api/reports/generate - 生成报告
  `);
});
