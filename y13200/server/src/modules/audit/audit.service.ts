import { Injectable } from '@nestjs/common';
import { AuditLogDto, GetAuditLogsQueryDto, CreateAuditLogDto, AuditAction, AuditEntityType } from './audit.dto';

@Injectable()
export class AuditService {
  private auditLogs: AuditLogDto[] = [
    {
      id: 'audit-1',
      trackId: '1',
      action: 'status_change',
      entityType: 'track',
      entityId: '1',
      userId: 'teacher-001',
      userName: '张老师',
      ip: '192.168.1.100',
      details: '曲目状态从 reviewing 变更为 suspended',
      oldValue: 'reviewing',
      newValue: 'suspended',
      createdAt: new Date('2026-06-14T10:30:00'),
    },
    {
      id: 'audit-2',
      trackId: '1',
      action: 'review',
      entityType: 'review',
      entityId: 'review-1',
      userId: 'teacher-001',
      userName: '张老师',
      ip: '192.168.1.100',
      details: '提交时码复核意见：时码偏半拍，待现场确认',
      createdAt: new Date('2026-06-14T10:25:00'),
    },
    {
      id: 'audit-3',
      trackId: '2',
      action: 'status_change',
      entityType: 'track',
      entityId: '2',
      userId: 'teacher-002',
      userName: '李老师',
      ip: '192.168.1.101',
      details: '曲目状态从 reviewing 变更为 approved',
      oldValue: 'reviewing',
      newValue: 'approved',
      createdAt: new Date('2026-06-13T15:20:00'),
    },
    {
      id: 'audit-4',
      action: 'upload',
      entityType: 'file',
      entityId: 'file-1',
      userId: 'operator-001',
      userName: '小孟',
      ip: '192.168.1.50',
      details: '上传文件: 01_夜曲_立体声_v3.wav',
      createdAt: new Date('2026-06-12T09:15:00'),
    },
    {
      id: 'audit-5',
      action: 'match',
      entityType: 'material',
      entityId: 'material-1',
      userId: 'system',
      userName: '系统',
      details: '自动匹配: 01_夜曲_立体声_v3.wav -> 曲目1',
      createdAt: new Date('2026-06-12T09:16:00'),
    },
  ];

  async findByTrackId(
    trackId: string,
    query: GetAuditLogsQueryDto,
  ): Promise<{ data: AuditLogDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = query;

    let filteredLogs = this.auditLogs.filter((log) => log.trackId === trackId);

    return this.paginateLogs(filteredLogs, page, limit);
  }

  async findAll(
    query: GetAuditLogsQueryDto,
  ): Promise<{ data: AuditLogDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, action, entityType, userId, startDate, endDate } = query;

    let filteredLogs = [...this.auditLogs];

    if (action) {
      filteredLogs = filteredLogs.filter((log) => log.action === action);
    }

    if (entityType) {
      filteredLogs = filteredLogs.filter((log) => log.entityType === entityType);
    }

    if (userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === userId);
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter((log) => log.createdAt >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter((log) => log.createdAt <= end);
    }

    return this.paginateLogs(filteredLogs, page, limit);
  }

  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLogDto> {
    const newLog: AuditLogDto = {
      id: `audit-${this.auditLogs.length + 1}`,
      ...createAuditLogDto,
      createdAt: new Date(),
    };

    this.auditLogs.push(newLog);
    return newLog;
  }

  async logOperation(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    userId: string,
    userName: string,
    options?: {
      trackId?: string;
      ip?: string;
      userAgent?: string;
      details?: string;
      oldValue?: string;
      newValue?: string;
    },
  ): Promise<AuditLogDto> {
    const newLog: AuditLogDto = {
      id: `audit-${this.auditLogs.length + 1}`,
      trackId: options?.trackId,
      action,
      entityType,
      entityId,
      userId,
      userName,
      ip: options?.ip,
      userAgent: options?.userAgent,
      details: options?.details,
      oldValue: options?.oldValue,
      newValue: options?.newValue,
      createdAt: new Date(),
    };

    this.auditLogs.push(newLog);
    return newLog;
  }

  private paginateLogs(
    logs: AuditLogDto[],
    page: number,
    limit: number,
  ): { data: AuditLogDto[]; total: number; page: number; limit: number } {
    logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = logs.slice(startIndex, endIndex);

    return {
      data: paginatedLogs,
      total: logs.length,
      page,
      limit,
    };
  }
}
