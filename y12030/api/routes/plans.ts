import { Router } from 'express';
import { DataService } from '../services/DataService.js';

const router = Router();
const dataService = DataService.getInstance();

router.get('/', (req, res) => {
  const plans = dataService.getPlans();
  res.json(plans);
});

router.get('/:id', (req, res) => {
  const plan = dataService.getPlan(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }
  res.json(plan);
});

export default router;
