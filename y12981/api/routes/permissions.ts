import express from 'express';
import permissionService from '../services/PermissionService';

const router = express.Router();

const DEFAULT_USER = { id: 'u002', name: '李华' };
const DEFAULT_REVIEWER = { id: 'u003', name: '王芳' };

router.get('/users', (req, res) => {
  try {
    const users = permissionService.getUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/requests', (req, res) => {
  try {
    const { status, requesterId } = req.query;
    const options: any = {};
    if (status) options.status = status as any;
    if (requesterId) options.requesterId = requesterId as string;

    const requests = permissionService.getRequests(options);
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/pending-count', (req, res) => {
  try {
    const count = permissionService.getPendingCount();
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/request', (req, res) => {
  try {
    const { requestedPermission, reason } = req.body;
    
    if (!requestedPermission || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'requestedPermission and reason are required' 
      });
    }

    const request = permissionService.createRequest(
      DEFAULT_USER.id,
      DEFAULT_USER.name,
      requestedPermission,
      reason
    );

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/approve/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = permissionService.approveRequest(
      id,
      DEFAULT_REVIEWER.id,
      DEFAULT_REVIEWER.name
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/reject/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body;
    
    if (!rejectReason) {
      return res.status(400).json({ 
        success: false, 
        error: 'rejectReason is required' 
      });
    }

    const result = permissionService.rejectRequest(
      id,
      DEFAULT_REVIEWER.id,
      DEFAULT_REVIEWER.name,
      rejectReason
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
