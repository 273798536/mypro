const express = require('express');
const router = express.Router();
const sampleService = require('../services/sampleService');
const { parse } = require('csv-parse/sync');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', (req, res) => {
  try {
    const params = {
      status: req.query.status || null,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20
    };
    const result = sampleService.listSamples(params);
    res.json({ code: 0, data: result });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const sample = sampleService.getSample(req.params.id);
    if (!sample) {
      return res.status(404).json({ code: 1, message: '样品不存在' });
    }
    res.json({ code: 0, data: sample });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.post('/import', (req, res) => {
  try {
    const { samples, operator } = req.body;
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ code: 1, message: '样品数据不能为空' });
    }
    const result = sampleService.importSamples(samples, operator || 'student');
    res.json({ code: 0, data: result });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.post('/import/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 1, message: '请上传 CSV 文件' });
    }

    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const samples = records.map(r => ({
      sample_no: r.sample_no || r['样品编号'],
      sampling_point: r.sampling_point || r['采样点'] || null,
      sampling_time: r.sampling_time || r['采样时间'] || null,
      temperature: r.temperature ? parseFloat(r.temperature) : null,
      ph: r.ph ? parseFloat(r.ph) : null,
      conductivity: r.conductivity ? parseFloat(r.conductivity) : null,
      manual_remark: r.manual_remark || r['备注'] || r.remark || null
    }));

    const operator = req.body.operator || 'student';
    const result = sampleService.importSamples(samples, operator);
    res.json({ code: 0, data: result });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const sample = sampleService.updateSample(
      req.params.id,
      req.body,
      req.body.operator || 'student'
    );
    res.json({ code: 0, data: sample });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

module.exports = router;
