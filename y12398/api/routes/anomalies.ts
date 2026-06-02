import express from 'express';
import { store } from '../data/store';
import { detectAllAnomalies } from '../utils/anomalyDetector';

const router = express.Router();

router.get('/', (req, res) => {
  const anomalies = store.getAnomalies().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, data: anomalies });
});

router.get('/:id', (req, res) => {
  const anomaly = store.getAnomalyById(req.params.id);
  if (!anomaly) {
    return res.status(404).json({ success: false, error: '异常未找到' });
  }
  res.json({ success: true, data: anomaly });
});

router.post('/detect', (req, res) => {
  const devices = store.getDevices();
  const records = store.getRecords();
  const existingAnomalies = store.getAnomalies();

  const detectedAnomalies = detectAllAnomalies(devices, records);

  const existingIds = new Set(existingAnomalies.map(a => `${a.type}-${a.deviceId}`));
  const newAnomalies = detectedAnomalies.filter(
    a => !existingIds.has(`${a.type}-${a.deviceId}`) || a.status === 'resolved'
  );

  newAnomalies.forEach(anomaly => {
    store.addAnomaly(anomaly);
  });

  const allAnomalies = store.getAnomalies();

  res.json({
    success: true,
    data: allAnomalies,
    message: `异常检测完成，新增 ${newAnomalies.length} 项异常`
  });
});

router.post('/:id/resolve', (req, res) => {
  const { resolutionNote, newDeviceStatus } = req.body;

  if (!resolutionNote) {
    return res.status(400).json({ success: false, error: '处理说明为必填项' });
  }

  const anomaly = store.getAnomalyById(req.params.id);
  if (!anomaly) {
    return res.status(404).json({ success: false, error: '异常未找到' });
  }

  const updated = store.updateAnomaly(req.params.id, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    resolutionNote
  });

  if (newDeviceStatus) {
    store.updateDevice(anomaly.deviceId, {
      status: newDeviceStatus
    });
  }

  res.json({ success: true, data: updated, message: '异常已处理' });
});

export default router;
