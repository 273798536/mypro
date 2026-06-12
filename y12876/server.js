const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./lib/db');
const ViolationAnalyzer = require('./lib/analyzer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db = null;
let analyzer = null;

async function initServer() {
  const dbPath = path.join(__dirname, 'data', 'classroom.db');
  db = new Database(dbPath);
  await db.init();
  analyzer = new ViolationAnalyzer(db);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '海底地形剖面课堂服务运行中' });
  });

  app.get('/api/profiles', (req, res) => {
    const profiles = db.prepare(`
      SELECT * FROM seabed_profiles ORDER BY id
    `).all();
    res.json(profiles);
  });

  app.get('/api/profiles/:id', (req, res) => {
    const profile = db.prepare(`
      SELECT * FROM seabed_profiles WHERE id = ?
    `).get(req.params.id);

    if (!profile) {
      return res.status(404).json({ error: '剖面不存在' });
    }

    const points = db.prepare(`
      SELECT distance, depth, lon, lat FROM seabed_profile_points
      WHERE profile_id = ? ORDER BY distance
    `).all(req.params.id);

    profile.points = points;
    res.json(profile);
  });

  app.get('/api/no-go-zones', (req, res) => {
    const zones = db.prepare(`
      SELECT id, name, description, zone_type FROM no_go_zones
      ORDER BY id
    `).all();

    for (const zone of zones) {
      const coords = db.prepare(`
        SELECT lon, lat FROM no_go_zone_coords
        WHERE zone_id = ? ORDER BY "order"
      `).all(zone.id);
      zone.polygon = coords.map(c => [c.lon, c.lat]);
    }

    res.json(zones);
  });

  app.get('/api/vessels', (req, res) => {
    const vessels = db.prepare(`SELECT * FROM vessels ORDER BY id`).all();
    res.json(vessels);
  });

  app.get('/api/vessels/:id/tracks', (req, res) => {
    const tracks = db.prepare(`
      SELECT * FROM vessel_tracks WHERE vessel_id = ? ORDER BY track_time
    `).all(req.params.id);
    res.json(tracks);
  });

  app.get('/api/tide-stations', (req, res) => {
    const version = req.query.version || 'v1';
    const stations = db.prepare(`
      SELECT DISTINCT ts.id, ts.name, ts.lon, ts.lat, ts.reference_level
      FROM tide_stations ts
      JOIN tide_predictions tp ON tp.station_id = ts.id
      WHERE tp.calc_version = ?
      ORDER BY ts.id
    `).all(version);

    for (const s of stations) {
      s.predictions = db.prepare(`
        SELECT pred_time, height FROM tide_predictions
        WHERE station_id = ? AND calc_version = ?
        ORDER BY pred_time
      `).all(s.id, version);
    }

    res.json(stations);
  });

  app.get('/api/wave-forecasts', (req, res) => {
    const forecasts = db.prepare(`
      SELECT * FROM wave_forecasts ORDER BY valid_time
    `).all();
    res.json(forecasts);
  });

  app.get('/api/aquaculture-logs', (req, res) => {
    const date = req.query.date;
    let sql = 'SELECT * FROM aquaculture_logs';
    const params = [];
    if (date) {
      sql += ' WHERE log_date = ?';
      params.push(date);
    }
    sql += ' ORDER BY log_date, farm_name';
    const logs = db.prepare(sql).all(...params);
    res.json(logs);
  });

  app.post('/api/analysis/runs', (req, res) => {
    const { runName, tideVersion, referenceTime, checkAquaculture, notes } = req.body;

    if (!runName) {
      return res.status(400).json({ error: 'runName 必填' });
    }

    try {
      const result = analyzer.runAnalysis(runName, {
        tideVersion: tideVersion || 'v1',
        referenceTime: referenceTime || null,
        checkAquaculture: checkAquaculture !== false,
        notes: notes || ''
      });
      res.json({ success: true, ...result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/analysis/runs', (req, res) => {
    const runs = db.prepare(`
      SELECT * FROM analysis_runs ORDER BY run_time DESC
    `).all();
    res.json(runs);
  });

  app.get('/api/analysis/runs/:id', (req, res) => {
    const result = analyzer.getAnalysisResult(req.params.id);
    if (!result) {
      return res.status(404).json({ error: '分析记录不存在' });
    }
    res.json(result);
  });

  app.get('/api/analysis/compare', (req, res) => {
    const { run1, run2 } = req.query;
    if (!run1 || !run2) {
      return res.status(400).json({ error: 'run1 和 run2 参数必填' });
    }
    const result = analyzer.compareRuns(run1, run2);
    if (!result) {
      return res.status(404).json({ error: '分析记录不存在' });
    }
    res.json(result);
  });

  app.post('/api/reports', (req, res) => {
    const { runId, reportType } = req.body;
    if (!runId) {
      return res.status(400).json({ error: 'runId 必填' });
    }
    try {
      const report = analyzer.generateReport(runId, reportType || 'maritime');
      if (!report) {
        return res.status(404).json({ error: '分析记录不存在' });
      }
      res.json({ success: true, ...report });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/reports', (req, res) => {
    const reports = db.prepare(`
      SELECT r.*, ar.run_name, ar.tide_version
      FROM reports r
      JOIN analysis_runs ar ON ar.id = r.run_id
      ORDER BY r.generated_at DESC
    `).all();
    res.json(reports);
  });

  app.get('/api/reports/:id', (req, res) => {
    const report = db.prepare(`
      SELECT r.*, ar.run_name, ar.tide_version
      FROM reports r
      JOIN analysis_runs ar ON ar.id = r.run_id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!report) {
      return res.status(404).json({ error: '报告不存在' });
    }

    if (typeof report.content === 'string') {
      report.content = JSON.parse(report.content);
    }

    res.json(report);
  });

  app.get('/api/data-gaps', (req, res) => {
    const runId = req.query.runId;
    let sql = 'SELECT * FROM data_gaps';
    const params = [];
    if (runId) {
      sql += ' WHERE run_id = ?';
      params.push(runId);
    }
    sql += ' ORDER BY impact_level DESC, id';
    const gaps = db.prepare(sql).all(...params);
    res.json(gaps);
  });

  app.post('/api/tide-versions/v2', (req, res) => {
    const tx = db.transaction(() => {
      const existing = db.prepare(`
        SELECT COUNT(*) as cnt FROM tide_predictions WHERE calc_version = 'v2'
      `).get();

      if (existing.cnt > 0) {
        return { message: 'v2版本已存在', count: existing.cnt };
      }

      const v1Preds = db.prepare(`
        SELECT station_id, pred_time, height FROM tide_predictions
        WHERE calc_version = 'v1' ORDER BY station_id, pred_time
      `).all();

      const insert = db.prepare(`
        INSERT INTO tide_predictions (station_id, pred_time, height, calc_version)
        VALUES (?, ?, ?, 'v2')
      `);

      for (const p of v1Preds) {
        const newHeight = p.height * 1.15 + 0.3;
        insert.run(p.station_id, p.pred_time, newHeight);
      }

      return { message: 'v2版本潮汐数据已生成', count: v1Preds.length };
    });

    const result = tx();
    res.json({ success: true, ...result });
  });

  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  海底地形剖面课堂 - 服务已启动`);
    console.log(`  地址: http://localhost:${PORT}`);
    console.log(`  数据库: ${dbPath}`);
    console.log(`========================================\n`);
  });
}

initServer().catch(e => {
  console.error('服务启动失败:', e.message);
  process.exit(1);
});
