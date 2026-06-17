import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { TrackModule } from '../track/track.module';
import { MaterialModule } from '../material/material.module';
import { NoteModule } from '../note/note.module';

@Module({
  imports: [TrackModule, MaterialModule, NoteModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
