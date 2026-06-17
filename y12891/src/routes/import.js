const express = require('express');
const router = express.Router();
const importService = require('../services/importService');

function handleImport(fn, req, res) {
  try {
    const { data, records } = req.body;
    const payload = data || records;
    if (!Array.isArray(payload)) {
      return res.status(400).json({
        success: false,
        error: '请求体必须包含 data 数组字段（材料数据列表）'
      });
    }
    const result = fn(req.params.id, payload, req.body.opts || {});
    res.json({ success: result.success, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

router.post('/:id/import/buoy', (req, res) => handleImport(importService.importBuoyData, req, res));
router.post('/:id/import/tide', (req, res) => handleImport(importService.importTideTables, req, res));
router.post('/:id/import/weather', (req, res) => handleImport(importService.importWeatherForecasts, req, res));
router.post('/:id/import/violation', (req, res) => handleImport(importService.importViolations, req, res));
router.post('/:id/import/photo', (req, res) => handleImport(importService.importPhotos, req, res));
router.post('/:id/import/aquaculture', (req, res) => handleImport(importService.importAquacultureLogs, req, res));

router.post('/:id/import/sample', (req, res) => {
  try {
    const result = importService.importAllFromSample(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
