import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLogDto, GetAuditLogsQueryDto } from './audit.dto';

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('tracks/:id/audit-logs')
  @HttpCode(HttpStatus.OK)
  async findByTrackId(
    @Param('id') trackId: string,
    @Query() query: GetAuditLogsQueryDto,
  ): Promise<{ code: number; message: string; data: { data: AuditLogDto[]; total: number; page: number; limit: number } }> {
    const result = await this.auditService.findByTrackId(trackId, query);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  @Get('audit-logs')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: GetAuditLogsQueryDto,
  ): Promise<{ code: number; message: string; data: { data: AuditLogDto[]; total: number; page: number; limit: number } }> {
    const result = await this.auditService.findAll(query);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }
}
