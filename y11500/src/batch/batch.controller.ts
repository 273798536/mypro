import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { BatchService } from './batch.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StateMachineService } from '../state-machine/state-machine.service';
import { DirtyRecordService } from '../dirty-record/dirty-record.service';

@Controller('batches')
@UseGuards(RolesGuard)
export class BatchController {
  constructor(
    private readonly batchService: BatchService,
    private readonly stateMachineService: StateMachineService,
    private readonly dirtyRecordService: DirtyRecordService,
  ) {}

  @Post()
  @Roles(Role.OPERATOR, Role.MANAGER)
  create(@Body() createBatchDto: CreateBatchDto, @CurrentUser() user) {
    return this.batchService.create(createBatchDto, user);
  }

  @Get()
  @Roles(Role.OPERATOR, Role.REVIEWER, Role.MANAGER, Role.VIEWER)
  findAll(@CurrentUser() user) {
    return this.batchService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.OPERATOR, Role.REVIEWER, Role.MANAGER, Role.VIEWER)
  findOne(@Param('id') id: string) {
    return this.batchService.findOne(id);
  }

  @Post(':id/submit')
  @Roles(Role.OPERATOR, Role.MANAGER)
  submitForReview(@Param('id') id: string, @CurrentUser() user) {
    return this.batchService.submitForReview(id, user);
  }

  @Post(':id/approve')
  @Roles(Role.REVIEWER, Role.MANAGER)
  approve(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body('opinion') opinion?: string,
  ) {
    return this.batchService.approve(id, user, opinion);
  }

  @Post(':id/reject')
  @Roles(Role.REVIEWER, Role.MANAGER)
  reject(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body('reason') reason: string,
  ) {
    return this.batchService.reject(id, user, reason);
  }

  @Post(':id/freeze')
  @Roles(Role.MANAGER)
  freeze(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body('reason') reason: string,
  ) {
    return this.batchService.freeze(id, user, reason);
  }

  @Post(':id/unfreeze')
  @Roles(Role.MANAGER)
  unfreeze(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body('reason') reason: string,
  ) {
    return this.batchService.unfreeze(id, user, reason);
  }

  @Post(':id/settle')
  @Roles(Role.MANAGER)
  settle(@Param('id') id: string, @CurrentUser() user) {
    return this.batchService.settle(id, user);
  }

  @Post(':id/cancel')
  @Roles(Role.MANAGER)
  cancel(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body('reason') reason: string,
  ) {
    return this.batchService.cancel(id, user, reason);
  }

  @Post(':id/archive')
  @Roles(Role.MANAGER)
  archive(@Param('id') id: string, @CurrentUser() user) {
    return this.batchService.archive(id, user);
  }

  @Get(':id/status-logs')
  @Roles(Role.OPERATOR, Role.REVIEWER, Role.MANAGER, Role.VIEWER)
  getStatusLogs(@Param('id') id: string) {
    return this.stateMachineService.getStatusLogs(id);
  }

  @Get(':id/dirty-records')
  @Roles(Role.OPERATOR, Role.REVIEWER, Role.MANAGER, Role.VIEWER)
  getDirtyRecords(@Param('id') id: string) {
    return this.dirtyRecordService.findByBatchId(id);
  }

  @Get(':id/repair-orders')
  @Roles(Role.OPERATOR, Role.REVIEWER, Role.MANAGER, Role.VIEWER)
  getRepairOrders(@Param('id') id: string) {
    return this.batchService.findRepairOrders(id);
  }

  @Get(':id/spare-part-scans')
  @Roles(Role.OPERATOR, Role.REVIEWER, Role.MANAGER, Role.VIEWER)
  getSparePartScans(@Param('id') id: string) {
    return this.batchService.findSparePartScans(id);
  }

  @Get(':id/customer-sign-photos')
  @Roles(Role.OPERATOR, Role.REVIEWER, Role.MANAGER, Role.VIEWER)
  getCustomerSignPhotos(@Param('id') id: string) {
    return this.batchService.findCustomerSignPhotos(id);
  }

  @Get(':id/scan-details')
  @Roles(Role.OPERATOR, Role.REVIEWER, Role.MANAGER, Role.VIEWER)
  getScanDetails(@Param('id') id: string) {
    return this.batchService.findScanDetails(id);
  }

  @Post('dirty-records/:id/resolve')
  @Roles(Role.REVIEWER, Role.MANAGER)
  resolveDirtyRecord(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body('handlingOpinion') handlingOpinion: string,
    @Body('resolvedContent') resolvedContent: string,
  ) {
    return this.dirtyRecordService.resolve(id, user, handlingOpinion, resolvedContent);
  }
}
