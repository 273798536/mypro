import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { Batch } from '../entities/batch.entity';
import { RepairOrder } from '../entities/repair-order.entity';
import { SparePartScan } from '../entities/spare-part-scan.entity';
import { CustomerSignPhoto } from '../entities/customer-sign-photo.entity';
import { ScanDetail } from '../entities/scan-detail.entity';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { DirtyRecordModule } from '../dirty-record/dirty-record.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Batch, RepairOrder, SparePartScan, CustomerSignPhoto, ScanDetail]),
    StateMachineModule,
    DirtyRecordModule,
  ],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
