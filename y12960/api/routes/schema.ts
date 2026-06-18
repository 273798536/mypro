import { Router } from 'express';
import { schemaController } from '../controllers/SchemaController';

const router = Router();

router.get('/versions', schemaController.getVersions);
router.get('/tables', schemaController.getTableNames);
router.get('/tables/:tableName/versions', schemaController.getVersionsForTable);
router.get('/versions/:id', schemaController.getVersionById);
router.post('/versions', schemaController.createVersion);
router.post('/compare', schemaController.compare);
router.post('/export-report', schemaController.exportReport);

export default router;
