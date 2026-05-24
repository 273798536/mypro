import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database/database.config';
import { BatchModule } from './batch/batch.module';
import { StateMachineModule } from './state-machine/state-machine.module';
import { DirtyRecordModule } from './dirty-record/dirty-record.module';
import { ExportModule } from './export/export.module';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([User]),
    BatchModule,
    StateMachineModule,
    DirtyRecordModule,
    ExportModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
