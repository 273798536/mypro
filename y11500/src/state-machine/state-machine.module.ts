import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StateMachineService } from './state-machine.service';
import { StatusLog } from '../entities/status-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StatusLog])],
  providers: [StateMachineService],
  exports: [StateMachineService],
})
export class StateMachineModule {}
