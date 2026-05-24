import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('export')
@UseGuards(RolesGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('manager-view')
  @Roles(Role.MANAGER, Role.REVIEWER)
  async getManagerView() {
    return this.exportService.getManagerView();
  }

  @Get('csv')
  @Roles(Role.MANAGER)
  async exportCSV(@Res() res: Response) {
    const csv = await this.exportService.exportToCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=batches.csv');
    res.send(csv);
  }

  @Get('statistics')
  @Roles(Role.MANAGER, Role.REVIEWER)
  async getStatistics() {
    return this.exportService.getStatistics();
  }
}
