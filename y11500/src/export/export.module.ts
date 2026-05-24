import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { Batch } from '../entities/batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Batch])],
  providers: [ExportService],
  controllers: [ExportController],
})
export class ExportModule {}
