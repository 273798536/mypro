const express = require('express');
const store = require('../models/store');

const router = express.Router();

router.post('/import', (req, res) => {
  try {
    const db = store.loadDB();
    const sampleService = require('../services/sampleService');
    const result = sampleService.importSamples(db);

    const alertService = require('../services/alertService');
    alertService.mergeAndSaveAlerts(db);

    store.saveDB(db);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/clear', (req, res) => {
  try {
    const db = store.loadDB();
    const sampleService = require('../services/sampleService');
    sampleService.clearAll(db);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;