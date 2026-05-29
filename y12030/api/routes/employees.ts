import { Router } from 'express';
import { DataService } from '../services/DataService.js';
import type { Employee, VestingSummary } from '../../shared/types.js';
import { VestingCalculator } from '../services/VestingCalculator.js';

const router = Router();
const dataService = DataService.getInstance();

router.get('/', (req, res) => {
  const employees = dataService.getEmployees();
  const summaries: VestingSummary[] = employees.map((employee) => {
    const grants = dataService.getGrantsByEmployee(employee.id);
    const exercises = dataService.getExercisesByEmployee(employee.id);

    let totalGranted = 0;
    let totalVested = 0;
    let totalPending = 0;
    let totalForfeited = 0;
    let totalExercised = exercises
      .filter((e) => e.status === 'completed')
      .reduce((sum, e) => sum + e.shares, 0);

    let hasException = false;
    let exceptionType: VestingSummary['exceptionType'];
    let exceptionNote = '';

    for (const grant of grants) {
      const plan = dataService.getPlan(grant.planId);
      if (!plan) continue;

      totalGranted += grant.totalShares;

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

      for (const schedule of schedules) {
        if (schedule.status === 'vested' || schedule.status === 'accelerated') {
          totalVested += schedule.vestedShares;
        } else if (schedule.status === 'pending') {
          totalPending += schedule.vestedShares;
        } else if (schedule.status === 'forfeited' || schedule.status === 'expired') {
          totalForfeited += schedule.vestedShares;
        }

        if (schedule.isAccelerated) {
          hasException = true;
          exceptionType = 'acceleration';
          exceptionNote = schedule.accelerationReason || '离职加速归属';
        }
        if (schedule.status === 'expired') {
          hasException = true;
          exceptionType = 'expired';
          exceptionNote = '行权窗口已过期';
        }
        if (schedule.status === 'forfeited') {
          hasException = true;
          exceptionType = 'forfeiture';
          exceptionNote = '离职未归属部分作废';
        }
      }

      const corrections = dataService.getCorrectionsByGrant(grant.id);
      if (corrections.length > 0) {
        hasException = true;
        exceptionType = 'correction';
        exceptionNote = `授予信息已修正(${corrections.length}次)`;
      }
    }

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      employeeNo: employee.employeeNo,
      department: employee.department,
      status: employee.status,
      totalGranted,
      totalVested,
      totalPending,
      totalForfeited,
      totalExercised,
      totalAvailable: totalVested - totalExercised,
      hasException,
      exceptionType,
      exceptionNote,
    };
  });

  res.json(summaries);
});

router.get('/:id', (req, res) => {
  const employee = dataService.getEmployee(req.params.id);
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  res.json(employee);
});

export default router;
