import db from '../db/database';
import crypto from 'crypto-js';
import { PermissionRequest, User } from '../../shared/types';
import auditService from './AuditService';

export class PermissionService {
  public getUsers(): User[] {
    return db.prepare('SELECT * FROM user').all() as User[];
  }

  public getUserById(id: string): User | undefined {
    return db.prepare('SELECT * FROM user WHERE id = ?').get(id) as User | undefined;
  }

  public hasPermission(userId: string, permission: string): boolean {
    const user = this.getUserById(userId);
    if (!user) return false;
    if (user.permissions === 'all') return true;
    return user.permissions.split(',').includes(permission);
  }

  public createRequest(
    requesterId: string,
    requesterName: string,
    requestedPermission: string,
    reason: string
  ): PermissionRequest {
    const now = Date.now();
    const id = 'pr-' + crypto.MD5('permreq' + now + Math.random()).toString();

    db.prepare(`
      INSERT INTO permission_request 
      (id, requester_id, requester_name, requested_permission, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, requesterId, requesterName, requestedPermission, reason, now);

    auditService.logOperation('permission', requesterId, requesterName, 
      `申请权限: ${requestedPermission}`, {
      reason
    });

    return {
      id,
      requesterId,
      requesterName,
      requestedPermission,
      reason,
      status: 'pending',
      createdAt: now
    };
  }

  public getRequests(options: {
    status?: 'pending' | 'approved' | 'rejected';
    requesterId?: string;
  } = {}): PermissionRequest[] {
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (options.status) {
      whereConditions.push('status = ?');
      params.push(options.status);
    }
    if (options.requesterId) {
      whereConditions.push('requester_id = ?');
      params.push(options.requesterId);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    const rows = db.prepare(`
      SELECT * FROM permission_request 
      ${whereClause}
      ORDER BY created_at DESC
    `).all(...params) as any[];

    return rows.map(r => ({
      id: r.id,
      requesterId: r.requester_id,
      requesterName: r.requester_name,
      requestedPermission: r.requested_permission,
      reason: r.reason,
      status: r.status,
      approverId: r.approver_id,
      approverName: r.approver_name,
      approvedAt: r.approved_at,
      rejectReason: r.reject_reason,
      createdAt: r.created_at
    }));
  }

  public approveRequest(
    requestId: string,
    approverId: string,
    approverName: string
  ): PermissionRequest {
    const request = db.prepare(
      'SELECT * FROM permission_request WHERE id = ?'
    ).get(requestId) as PermissionRequest | undefined;
    
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request already processed');

    const now = Date.now();

    db.prepare(`
      UPDATE permission_request 
      SET status = 'approved', approver_id = ?, approver_name = ?, approved_at = ?
      WHERE id = ?
    `).run(approverId, approverName, now, requestId);

    const user = this.getUserById(request.requesterId);
    if (user) {
      const currentPermissions = user.permissions.split(',');
      if (!currentPermissions.includes(request.requestedPermission)) {
        currentPermissions.push(request.requestedPermission);
        db.prepare('UPDATE user SET permissions = ? WHERE id = ?').run(
          currentPermissions.join(','),
          request.requesterId
        );
      }
    }

    auditService.logOperation('permission', approverId, approverName,
      `批准权限申请: ${request.requestedPermission} for ${request.requesterName}`, {
      approverId,
      approverName,
      reason: `批准 ${request.requesterName} 的权限申请`
    });

    return {
      ...request,
      status: 'approved',
      approverId,
      approverName,
      approvedAt: now
    };
  }

  public rejectRequest(
    requestId: string,
    approverId: string,
    approverName: string,
    rejectReason: string
  ): PermissionRequest {
    const request = db.prepare(
      'SELECT * FROM permission_request WHERE id = ?'
    ).get(requestId) as PermissionRequest | undefined;
    
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request already processed');

    const now = Date.now();

    db.prepare(`
      UPDATE permission_request 
      SET status = 'rejected', approver_id = ?, approver_name = ?, approved_at = ?, reject_reason = ?
      WHERE id = ?
    `).run(approverId, approverName, now, rejectReason, requestId);

    auditService.logOperation('permission', approverId, approverName,
      `驳回权限申请: ${request.requestedPermission} for ${request.requesterName}`, {
      approverId,
      approverName,
      reason: rejectReason
    });

    return {
      ...request,
      status: 'rejected',
      approverId,
      approverName,
      approvedAt: now,
      rejectReason
    };
  }

  public getPendingCount(): number {
    return (db.prepare(
      "SELECT COUNT(*) as count FROM permission_request WHERE status = 'pending'"
    ).get() as { count: number }).count;
  }
}

export default new PermissionService();
