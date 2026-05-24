import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { filterFields } from '../middleware/fieldFilter.middleware';
import { authController } from '../controllers/auth.controller';
import { declarationController } from '../controllers/declaration.controller';
import { trajectoryController } from '../controllers/trajectory.controller';
import { taxController } from '../controllers/tax.controller';
import { reconciliationController } from '../controllers/reconciliation.controller';
import { commentController } from '../controllers/comment.controller';
import { badDataController } from '../controllers/badData.controller';
import { reportController } from '../controllers/report.controller';

const router = Router();

router.post('/auth/login', authController.login.bind(authController));
router.get('/auth/me', authenticateToken, authController.getCurrentUser.bind(authController));
router.get('/users', authenticateToken, requirePermission('user:read'), filterFields('user'), authController.listUsers.bind(authController));

router.post('/declarations', authenticateToken, requirePermission('declaration:create'), declarationController.create.bind(declarationController));
router.get('/declarations', authenticateToken, requirePermission('declaration:read'), filterFields('declaration'), declarationController.list.bind(declarationController));
router.get('/declarations/:id', authenticateToken, requirePermission('declaration:read'), filterFields('declaration'), declarationController.getById.bind(declarationController));
router.put('/declarations/:id', authenticateToken, requirePermission('declaration:update'), declarationController.update.bind(declarationController));
router.post('/declarations/:id/review', authenticateToken, requirePermission('declaration:review'), declarationController.review.bind(declarationController));
router.post('/declarations/:id/approve', authenticateToken, requirePermission('declaration:approve'), declarationController.approve.bind(declarationController));

router.post('/trajectory', authenticateToken, requirePermission('trajectory:create'), trajectoryController.create.bind(trajectoryController));
router.get('/trajectory/declaration/:declarationId', authenticateToken, requirePermission('trajectory:read'), filterFields('trajectory'), trajectoryController.getByDeclarationId.bind(trajectoryController));
router.put('/trajectory/:id', authenticateToken, requirePermission('trajectory:update'), trajectoryController.update.bind(trajectoryController));
router.post('/trajectory/:id/abnormal', authenticateToken, requirePermission('trajectory:update'), trajectoryController.markAbnormal.bind(trajectoryController));

router.post('/tax-notices', authenticateToken, requirePermission('tax:create'), taxController.create.bind(taxController));
router.get('/tax-notices', authenticateToken, requirePermission('tax:read'), filterFields('tax'), taxController.list.bind(taxController));
router.get('/tax-notices/:id', authenticateToken, requirePermission('tax:read'), filterFields('tax'), taxController.getById.bind(taxController));
router.get('/tax-notices/declaration/:declarationId', authenticateToken, requirePermission('tax:read'), filterFields('tax'), taxController.getByDeclarationId.bind(taxController));
router.put('/tax-notices/:id', authenticateToken, requirePermission('tax:update'), taxController.update.bind(taxController));
router.post('/tax-notices/:id/paid', authenticateToken, requirePermission('tax:update'), taxController.markPaid.bind(taxController));
router.post('/tax-notices/:id/waive', authenticateToken, requirePermission('tax:waive'), taxController.waive.bind(taxController));

router.post('/reconciliation/run', authenticateToken, requirePermission('reconcile:run'), reconciliationController.runReconciliation.bind(reconciliationController));
router.get('/reconciliation/results', authenticateToken, requirePermission('reconcile:read'), filterFields('reconciliation'), reconciliationController.listResults.bind(reconciliationController));
router.get('/reconciliation/results/:id', authenticateToken, requirePermission('reconcile:read'), filterFields('reconciliation'), reconciliationController.getById.bind(reconciliationController));
router.get('/reconciliation/playback/:declarationId', authenticateToken, requirePermission('reconcile:read'), reconciliationController.getPlaybackChain.bind(reconciliationController));
router.post('/reconciliation/results/:id/resolve', authenticateToken, requirePermission('reconcile:resolve'), reconciliationController.resolve.bind(reconciliationController));

router.post('/comments', authenticateToken, requirePermission('comment:create'), commentController.create.bind(commentController));
router.get('/comments', authenticateToken, requirePermission('comment:read'), filterFields('comment'), commentController.list.bind(commentController));
router.get('/comments/declaration/:declarationId', authenticateToken, requirePermission('comment:read'), filterFields('comment'), commentController.getByDeclarationId.bind(commentController));

router.get('/bad-data', authenticateToken, requirePermission('bad_data:read'), filterFields('badData'), badDataController.list.bind(badDataController));
router.get('/bad-data/:id', authenticateToken, requirePermission('bad_data:read'), filterFields('badData'), badDataController.getById.bind(badDataController));
router.post('/bad-data/:id/fix', authenticateToken, requirePermission('bad_data:update'), badDataController.fix.bind(badDataController));
router.post('/bad-data/:id/discard', authenticateToken, requirePermission('bad_data:delete'), badDataController.discard.bind(badDataController));

router.post('/reports/generate', authenticateToken, requirePermission('report:generate'), reportController.generateReport.bind(reportController));
router.get('/reports/download/:filename', authenticateToken, requirePermission('report:read'), reportController.downloadReport.bind(reportController));

export default router;
