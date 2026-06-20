const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'data', 'database.json');

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function generateRunId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `RUN-${dateStr}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'recall-funnel-anomaly-playback' });
});

app.get('/api/gray-configs', (req, res) => {
  const db = readDB();
  res.json(db.gray_configs);
});

app.get('/api/playback-runs', (req, res) => {
  const db = readDB();
  const { status, config_id, duplicate_only } = req.query;

  let runs = [...db.playback_runs];

  if (status) {
    runs = runs.filter(r => r.status === status);
  }
  if (config_id) {
    runs = runs.filter(r => r.config_id === config_id);
  }
  if (duplicate_only === 'true') {
    runs = runs.filter(r => r.run_id_duplicate);
  }

  const result = runs.map(run => {
    const config = db.gray_configs.find(c => c.config_id === run.config_id);
    return {
      ...run,
      config_name: config ? config.name : 'Unknown',
      bucket: config ? config.bucket : 'Unknown'
    };
  });

  res.json(result);
});

app.get('/api/playback-runs/:runId', (req, res) => {
  const db = readDB();
  const run = db.playback_runs.find(r => r.run_id === req.params.runId);
  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }
  const config = db.gray_configs.find(c => c.config_id === run.config_id);
  res.json({ ...run, config_name: config ? config.name : 'Unknown', config });
});

app.post('/api/playback-runs', (req, res) => {
  const db = readDB();
  const { config_id, triggered_by = 'manual_rerun' } = req.body;

  const config = db.gray_configs.find(c => c.config_id === config_id);
  if (!config) {
    return res.status(400).json({ error: 'Config not found' });
  }

  const existingSameDay = db.playback_runs.filter(r => {
    return r.config_id === config_id && r.run_id.startsWith('RUN-' + new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  });

  let run_id = generateRunId();
  let run_id_duplicate = db.playback_runs.some(r => r.run_id === run_id);
  let duplicate_note = null;
  let evidence_path_suffix = '';

  if (existingSameDay.length > 0 || run_id_duplicate) {
    run_id_duplicate = true;
    const dupCount = existingSameDay.length + 1;
    duplicate_note = `该 run_id 当日第 ${dupCount} 次运行，请注意区分`;
    evidence_path_suffix = `_dup${dupCount}`;
  }

  const prevRun = db.playback_runs
    .filter(r => r.config_id === config_id)
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))[0];

  const samples = prevRun
    ? db.samples.filter(s => s.run_id === prevRun.run_id)
    : [];

  const newRun = {
    run_id,
    run_id_duplicate,
    duplicate_note,
    config_id,
    start_time: new Date().toISOString(),
    end_time: null,
    triggered_by,
    sample_count: samples.length || 5000,
    anomaly_count: 0,
    status: 'running',
    metrics: prevRun ? JSON.parse(JSON.stringify(prevRun.metrics)) : {
      overall_recall_rate: 0,
      baseline_recall_rate: 0,
      anomaly_rate: 0,
      channels: {}
    },
    evidence_path: `/evidence/${run_id}${evidence_path_suffix}/`,
    rerun_from: prevRun ? prevRun.run_id : null,
    rerun_note: req.body.rerun_note || null
  };

  db.playback_runs.unshift(newRun);
  writeDB(db);

  setTimeout(() => {
    const db2 = readDB();
    const runIndex = db2.playback_runs.findIndex(r => r.run_id === run_id);
    if (runIndex >= 0) {
      db2.playback_runs[runIndex].status = 'completed';
      db2.playback_runs[runIndex].end_time = new Date().toISOString();
      db2.playback_runs[runIndex].anomaly_count = Math.floor(Math.random() * 150) + 30;
      writeDB(db2);
    }
  }, 3000);

  res.status(201).json(newRun);
});

app.get('/api/samples', (req, res) => {
  const db = readDB();
  const {
    run_id,
    is_anomaly,
    anomaly_type,
    review_status,
    channel,
    has_manual_correction,
    page = 1,
    page_size = 20
  } = req.query;

  let samples = [...db.samples];

  if (run_id) {
    samples = samples.filter(s => s.run_id === run_id);
  }
  if (is_anomaly !== undefined) {
    samples = samples.filter(s => String(s.is_anomaly) === is_anomaly);
  }
  if (anomaly_type) {
    samples = samples.filter(s => s.anomaly_type === anomaly_type);
  }
  if (review_status) {
    samples = samples.filter(s => s.review_status === review_status);
  }
  if (channel) {
    samples = samples.filter(s => s.channel === channel);
  }
  if (has_manual_correction === 'true') {
    samples = samples.filter(s => s.manual_correction !== null);
  }
  if (has_manual_correction === 'false') {
    samples = samples.filter(s => s.manual_correction === null);
  }

  const total = samples.length;
  const start = (parseInt(page) - 1) * parseInt(page_size);
  const paginated = samples.slice(start, start + parseInt(page_size));

  const enriched = paginated.map(s => {
    const run = db.playback_runs.find(r => r.run_id === s.run_id);
    return {
      ...s,
      run_id_duplicate: run ? run.run_id_duplicate : false
    };
  });

  res.json({
    total,
    page: parseInt(page),
    page_size: parseInt(page_size),
    data: enriched
  });
});

app.get('/api/samples/:sampleId', (req, res) => {
  const db = readDB();
  const sample = db.samples.find(s => s.sample_id === req.params.sampleId);
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }
  const run = db.playback_runs.find(r => r.run_id === sample.run_id);
  const config = db.gray_configs.find(c => c.config_id === sample.config_id);
  res.json({
    ...sample,
    run: run ? { ...run, config_name: config ? config.name : 'Unknown' } : null,
    config: config || null
  });
});

app.post('/api/samples/:sampleId/correct', (req, res) => {
  const db = readDB();
  const sampleIndex = db.samples.findIndex(s => s.sample_id === req.params.sampleId);
  if (sampleIndex < 0) {
    return res.status(404).json({ error: 'Sample not found' });
  }

  const { corrected_label, corrected_by, correction_note, evidence_attachments = [] } = req.body;

  db.samples[sampleIndex].manual_correction = {
    corrected_label,
    corrected_by,
    corrected_at: new Date().toISOString(),
    correction_note,
    evidence_attachments
  };
  db.samples[sampleIndex].review_status = corrected_label === 'normal' ? 'corrected' : 'corrected_anomaly';

  writeDB(db);
  res.json(db.samples[sampleIndex]);
});

app.get('/api/anomaly-queue', (req, res) => {
  const db = readDB();
  const { status, assignee, priority } = req.query;

  const anomalySamples = db.samples.filter(s => s.is_anomaly);

  const queue = anomalySamples.map(s => {
    const run = db.playback_runs.find(r => r.run_id === s.run_id);
    const config = db.gray_configs.find(c => c.config_id === s.config_id);
    const user = s.assignee ? db.users.find(u => u.username === s.assignee) : null;

    let processing_status = 'pending';
    if (s.manual_correction) {
      processing_status = 'corrected';
    } else if (s.review_status === 'confirmed_normal') {
      processing_status = 'confirmed_normal';
    } else if (s.assignee) {
      processing_status = 'in_progress';
    }

    return {
      sample_id: s.sample_id,
      run_id: s.run_id,
      run_id_duplicate: run ? run.run_id_duplicate : false,
      config_id: s.config_id,
      config_name: config ? config.name : 'Unknown',
      scene: s.scene,
      channel: s.channel,
      anomaly_type: s.anomaly_type,
      anomaly_score: s.anomaly_score,
      recall_hit_rate: s.recall_hit_rate,
      baseline_hit_rate: s.baseline_hit_rate,
      review_status: s.review_status,
      processing_status,
      assignee: s.assignee,
      assignee_name: user ? user.name : null,
      has_manual_correction: s.manual_correction !== null,
      note: s.note || null,
      timestamp: s.timestamp
    };
  });

  let filtered = queue;
  if (status) {
    const statuses = status.split(',');
    filtered = filtered.filter(q => statuses.includes(q.processing_status));
  }
  if (assignee) {
    filtered = filtered.filter(q => q.assignee === assignee);
  }

  const stats = {
    total: queue.length,
    pending: queue.filter(q => q.processing_status === 'pending').length,
    in_progress: queue.filter(q => q.processing_status === 'in_progress').length,
    corrected: queue.filter(q => q.processing_status === 'corrected').length,
    confirmed_normal: queue.filter(q => q.processing_status === 'confirmed_normal').length,
    need_evidence: queue.filter(q => q.processing_status === 'pending' && !q.has_manual_correction).length
  };

  res.json({ stats, data: filtered });
});

app.get('/api/impact-analysis', (req, res) => {
  const db = readDB();
  const { run_id } = req.query;

  let samples = db.samples.filter(s => s.is_anomaly);
  if (run_id) {
    samples = samples.filter(s => s.run_id === run_id);
  }

  const channelImpact = {};
  samples.forEach(s => {
    if (!channelImpact[s.channel]) {
      channelImpact[s.channel] = {
        channel: s.channel,
        anomaly_count: 0,
        total_rate_drop: 0,
        avg_rate_drop: 0,
        corrected_count: 0,
        samples: []
      };
    }
    const drop = Math.max(0, s.baseline_hit_rate - s.recall_hit_rate);
    channelImpact[s.channel].anomaly_count++;
    channelImpact[s.channel].total_rate_drop += drop;
    if (s.manual_correction && s.manual_correction.corrected_label === 'normal') {
      channelImpact[s.channel].corrected_count++;
    }
    channelImpact[s.channel].samples.push({
      sample_id: s.sample_id,
      drop,
      anomaly_score: s.anomaly_score,
      corrected: s.manual_correction && s.manual_correction.corrected_label === 'normal'
    });
  });

  Object.values(channelImpact).forEach(c => {
    c.avg_rate_drop = c.anomaly_count > 0 ? c.total_rate_drop / c.anomaly_count : 0;
    c.samples.sort((a, b) => b.drop - a.drop);
  });

  const highImpactSamples = samples
    .map(s => ({
      sample_id: s.sample_id,
      run_id: s.run_id,
      channel: s.channel,
      anomaly_score: s.anomaly_score,
      rate_drop: Math.max(0, s.baseline_hit_rate - s.recall_hit_rate),
      recall_hit_rate: s.recall_hit_rate,
      baseline_hit_rate: s.baseline_hit_rate,
      has_correction: s.manual_correction !== null,
      review_status: s.review_status
    }))
    .sort((a, b) => b.rate_drop - a.rate_drop)
    .slice(0, 20);

  res.json({
    channel_impact: Object.values(channelImpact).sort((a, b) => b.total_rate_drop - a.total_rate_drop),
    high_impact_samples: highImpactSamples
  });
});

app.get('/api/export/samples', (req, res) => {
  const db = readDB();
  const { run_id } = req.query;

  let samples = [...db.samples];
  if (run_id) {
    samples = samples.filter(s => s.run_id === run_id);
  }

  const exportData = samples.map(s => {
    const run = db.playback_runs.find(r => r.run_id === s.run_id);
    const config = db.gray_configs.find(c => c.config_id === s.config_id);
    return {
      '样本ID': s.sample_id,
      '运行ID': s.run_id,
      '运行ID重复': run && run.run_id_duplicate ? '是' : '否',
      '重复说明': run && run.duplicate_note ? run.duplicate_note : '',
      '灰度配置': config ? config.name : 'Unknown',
      '配置ID': s.config_id,
      '场景': s.scene,
      '召回通道': s.channel,
      '是否异常': s.is_anomaly ? '是' : '否',
      '异常类型': s.anomaly_type || '',
      '异常分数': s.anomaly_score,
      '召回命中率': s.recall_hit_rate,
      '基线命中率': s.baseline_hit_rate,
      '命中率差值': (s.baseline_hit_rate - s.recall_hit_rate).toFixed(4),
      '审核状态': s.review_status,
      '处理人': s.assignee || '',
      '是否人工改判': s.manual_correction ? '是' : '否',
      '改判结果': s.manual_correction ? s.manual_correction.corrected_label : '',
      '改判人': s.manual_correction ? s.manual_correction.corrected_by : '',
      '改判说明': s.manual_correction ? s.manual_correction.correction_note : '',
      '样本时间': s.timestamp
    };
  });

  try {
    const parser = new Parser();
    const csv = parser.parse(exportData);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="recall_samples_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(db.users);
});

app.listen(PORT, () => {
  console.log(`Recall Funnel Anomaly Playback Server running on port ${PORT}`);
});
