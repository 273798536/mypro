import { Router } from 'express';
import { permissionController } from '../controllers/PermissionController';

const router = Router();

router.get('/me', permissionController.getCurrentUser);
router.get('/roles', permissionController.getRoles);
router.get('/users', permissionController.getUsers);
router.get('/list', permissionController.getPermissionList);
router.get('/audit-log', permissionController.getAuditLog);
router.put('/users/:userId/role', permissionController.updateUserRole);
router.put('/roles/:roleId/permissions', permissionController.updateRolePermissions);

export default router;
