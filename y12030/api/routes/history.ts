import { Router } from 'express';
import { DataService } from '../services/DataService.js';

const router = Router();
const dataService = DataService.getInstance();

router.get('/', (req, res) => {
  const corrections = dataService.getCorrections();
  const enriched = corrections.map((c) => {
    const grant = dataService.getGrant(c.grantId);
    const employee = grant ? dataService.getEmployee(grant.employeeId) : null;
    return {
      ...c,
      employeeName: employee?.name,
      employeeNo: employee?.employeeNo,
    };
  });
  res.json(enriched);
});

export default router;
