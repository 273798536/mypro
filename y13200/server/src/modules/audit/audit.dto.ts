import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'review'
  | 'export'
  | 'upload'
  | 'match'
  | 'login';

export type AuditEntityType =
  | 'track'
  | 'file'
  | 'material'
  | 'review'
  | 'note'
  | 'tour'
  | 'show';

export class AuditLogDto {
  id: string;
  trackId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  userId: string;
  userName: string;
  ip?: string;
  userAgent?: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: Date;
}

export class GetAuditLogsQueryDto {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsEnum(['create', 'update', 'delete', 'status_change', 'review', 'export', 'upload', 'match', 'login'])
  action?: AuditAction;

  @IsOptional()
  @IsEnum(['track', 'file', 'material', 'review', 'note', 'tour', 'show'])
  entityType?: AuditEntityType;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class CreateAuditLogDto {
  @IsOptional()
  @IsString()
  trackId?: string;

  @IsEnum(['create', 'update', 'delete', 'status_change', 'review', 'export', 'upload', 'match', 'login'])
  action: AuditAction;

  @IsEnum(['track', 'file', 'material', 'review', 'note', 'tour', 'show'])
  entityType: AuditEntityType;

  @IsString()
  entityId: string;

  @IsString()
  userId: string;

  @IsString()
  userName: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  oldValue?: string;

  @IsOptional()
  @IsString()
  newValue?: string;
}
