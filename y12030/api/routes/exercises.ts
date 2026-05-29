import { Router } from 'express';
import { DataService } from '../services/DataService.js';
import type { ExerciseRequest, ExerciseApproval } from '../../shared/types.js';

const router = Router();
const dataService = DataService.getInstance();

router.get('/', (req, res) => {
  const exercises = dataService.getExercises();
  const enriched = exercises.map((e) => {
    const employee = dataService.getEmployee(e.employeeId);
    const grant = dataService.getGrant(e.grantId);
    return {
      ...e,
      employeeName: employee?.name,
      grantTotalShares: grant?.totalShares,
    };
  });
  res.json(enriched);
});

router.post('/', (req, res) => {
  const body = req.body as ExerciseRequest;

  const exercise = dataService.addExercise({
    id: 'exe_' + Date.now(),
    grantId: body.grantId,
    vestingScheduleId: body.vestingScheduleId,
    employeeId: body.employeeId,
    shares: body.shares,
    applicationDate: new Date().toISOString().split('T')[0],
    status: 'pending',
    applicant: body.applicant,
    exercisePrice: body.exercisePrice,
    fairMarketValue: body.fairMarketValue,
  });

  res.json(exercise);
});

router.put('/:id', (req, res) => {
  const body = req.body as ExerciseApproval;
  const exercise = dataService.getExercise(req.params.id);

  if (!exercise) {
    res.status(404).json({ error: 'Exercise not found' });
    return;
  }

  const updated = dataService.updateExercise(req.params.id, {
    status: body.status,
    approver: body.approver,
    approvalDate: new Date().toISOString().split('T')[0],
    rejectionReason: body.rejectionReason,
  });

  res.json(updated);
});

export default router;
