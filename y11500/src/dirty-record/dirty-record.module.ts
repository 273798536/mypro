import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirtyRecordService } from './dirty-record.service';
import { DirtyRecord } from '../entities/dirty-record.entity';
import { RepairOrder } from '../entities/repair-order.entity';
import { SparePartScan } from '../entities/spare-part-scan.entity';
import { ScanDetail } from '../entities/scan-detail.entity';
import { Batch } from '../entities/batch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DirtyRecord, RepairOrder, SparePartScan, ScanDetail, Batch]),
  ],
  providers: [DirtyRecordService],
  exports: [DirtyRecordService],
})
export class DirtyRecordModule {}
