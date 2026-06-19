import express from 'express';
import boundaryCaseService from '../services/BoundaryCaseService';

const router = express.Router();

const DEFAULT_USER = { id: 'u002', name: '李华' };

router.get('/cases', (req, res) => {
  try {
    const cases = boundaryCaseService.getAll();
    res.json({ success: true, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/cases/:id', (req, res) => {
  try {
    const { id } = req.params;
    const caseData = boundaryCaseService.getById(id);
    if (!caseData) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: caseData });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/run/:caseId', (req, res) => {
  try {
    const { caseId } = req.params;
    const result = boundaryCaseService.runCase(
      caseId,
      DEFAULT_USER.id,
      DEFAULT_USER.name
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/run-all', (req, res) => {
  try {
    const result = boundaryCaseService.runAllCases(
      DEFAULT_USER.id,
      DEFAULT_USER.name
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/bad-data-sample', (req, res) => {
  try {
    const badDataCase = boundaryCaseService.getCaseWithRealBadData();
    res.json({ success: true, data: badDataCase });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
