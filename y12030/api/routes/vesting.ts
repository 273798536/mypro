import { Router } from 'express';
import { DataService } from '../services/DataService.js';
import { VestingCalculator } from '../services/VestingCalculator.js';
import type { VestingDetail, CorrectionRequest } from '../../shared/types.js';

const router = Router();
const dataService = DataService.getInstance();

router.get('/:employeeId', (req, res) => {
  const employee = dataService.getEmployee(req.params.employeeId);
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  const grants = dataService.getGrantsByEmployee(employee.id);
  if (grants.length === 0) {
    res.status(404).json({ error: 'No grants found for employee' });
    return;
  }

  const grant = grants[0];
  const plan = dataService.getPlan(grant.planId);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  let schedules = dataService.getSchedules(grant.id);
  if (!schedules) {
    schedules = VestingCalculator.calculate({
      grant,
      plan,
      employee,
      calculationDate: new Date('2026-05-30'),
    });
    dataService.setSchedules(grant.id, schedules);
  }

  const exercises = dataService.getExercisesByEmployee(employee.id);
  const corrections = dataService.getCorrectionsByGrant(grant.id);

  const detail: VestingDetail = {
    employee,
    grant,
    plan,
    schedules,
    exercises,
    corrections,
  };

  res.json(detail);
});

router.post('/:employeeId/correct', (req, res) => {
  const body = req.body as CorrectionRequest;
  const employee = dataService.getEmployee(req.params.employeeId);

  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  const grants = dataService.getGrantsByEmployee(employee.id);
  if (grants.length === 0) {
    res.status(404).json({ error: 'No grants found for employee' });
    return;
  }

  const grant = grants[0];
  const plan = dataService.getPlan(grant.planId);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const oldValue = String(grant[body.fieldName as keyof typeof grant] || '');

  let updatedGrant;
  if (body.fieldName === 'totalShares') {
    const oldTotalShares = grant.totalShares;
    const newTotalShares = parseInt(body.newValue, 10);

    updatedGrant = dataService.updateGrant(grant.id, {
      totalShares: newTotalShares,
    });

    const oldSchedules = dataService.getSchedules(grant.id) || [];
    const newSchedules = VestingCalculator.recalculateAfterCorrection(
      oldSchedules,
      newTotalShares,
      oldTotalShares,
    );
    dataService.setSchedules(grant.id, newSchedules);
  } else {
    updatedGrant = dataService.updateGrant(grant.id, {
      [body.fieldName]: body.newValue,
    });
    dataService.clearSchedules(grant.id);
  }

  const correction = dataService.addCorrection({
    id: 'corr_' + Date.now(),
    grantId: grant.id,
    fieldName: body.fieldName,
    oldValue,
    newValue: body.newValue,
    reason: body.reason,
    operator: body.operator,
    timestamp: new Date().toISOString(),
  });

  let schedules = dataService.getSchedules(grant.id);
  if (!schedules) {
    schedules = VestingCalculator.calculate({
      grant: updatedGrant!,
      plan,
      employee,
      calculationDate: new Date('2026-05-30'),
    });
    dataService.setSchedules(grant.id, schedules);
  }

  const exercises = dataService.getExercisesByEmployee(employee.id);
  const corrections = dataService.getCorrectionsByGrant(grant.id);

  const detail: VestingDetail = {
    employee,
    grant: updatedGrant!,
    plan,
    schedules,
    exercises,
    corrections,
  };

  res.json({ detail, correction });
});

export default router;
