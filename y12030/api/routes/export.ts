import { Router } from 'express';
import { DataService } from '../services/DataService.js';
import { VestingCalculator } from '../services/VestingCalculator.js';
import { ExportService } from '../services/ExportService.js';
import type { VestingDetail } from '../../shared/types.js';

const router = Router();
const dataService = DataService.getInstance();

router.get('/csv', (req, res) => {
  const employees = dataService.getEmployees();
  const details: VestingDetail[] = [];

  for (const employee of employees) {
    const grants = dataService.getGrantsByEmployee(employee.id);
    if (grants.length === 0) continue;

    const grant = grants[0];
    const plan = dataService.getPlan(grant.planId);
    if (!plan) continue;

    let schedules = dataService.getSchedules(grant.id);
    if (!schedules) {
      schedules = VestingCalculator.calculate({
        grant,
        plan,
        employee,
        calculationDate: new Date('2026-05-30'),
      });
    }

    const exercises = dataService.getExercisesByEmployee(employee.id);
    const corrections = dataService.getCorrectionsByGrant(grant.id);

    details.push({
      employee,
      grant,
      plan,
      schedules,
      exercises,
      corrections,
    });
  }

  const csv = ExportService.toCSV(details);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="vesting-ledger-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send('\uFEFF' + csv);
});

router.get('/csv/:employeeId', (req, res) => {
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

  const csv = ExportService.toDetailedCSV(detail);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="vesting-${employee.employeeNo}-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send('\uFEFF' + csv);
});

export default router;
