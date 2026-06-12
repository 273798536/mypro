import { Router } from 'express';
import { RecordsController } from '../controllers/index';

const router = Router();

router.get('/', RecordsController.getAll);
router.get('/:id', RecordsController.getOne);
router.post('/', RecordsController.create);
router.put('/:id', RecordsController.update);
router.delete('/:id', RecordsController.remove);
router.post('/import', RecordsController.batchImport);
router.post('/:id/assess', RecordsController.assess);
router.get('/:id/assessments', RecordsController.getAssessmentHistory);
router.get('/:id/log', RecordsController.getLog);

export default router;
