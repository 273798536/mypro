import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TourModule } from './modules/tour/tour.module';
import { TrackModule } from './modules/track/track.module';
import { FileModule } from './modules/file/file.module';
import { MaterialModule } from './modules/material/material.module';
import { MatchingModule } from './modules/matching/matching.module';
import { ReviewModule } from './modules/review/review.module';
import { NoteModule } from './modules/note/note.module';
import { AuditModule } from './modules/audit/audit.module';
import { ExportModule } from './modules/export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TourModule,
    TrackModule,
    FileModule,
    MaterialModule,
    MatchingModule,
    ReviewModule,
    NoteModule,
    AuditModule,
    ExportModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
