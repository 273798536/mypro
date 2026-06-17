import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExportService } from './export.service';
import {
  ExportTemplateDto,
  ExportRequestDto,
  ExportResponseDto,
  ExportHistoryDto,
  ExportFilterDto,
} from './export.dto';
import { TrackService } from '../track/track.service';
import { MaterialService } from '../material/material.service';
import { NoteService } from '../note/note.service';
import { GetTracksQueryDto } from '../track/track.dto';

@Controller('export')
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly trackService: TrackService,
    private readonly materialService: MaterialService,
    private readonly noteService: NoteService,
  ) {}

  @Get('templates')
  @HttpCode(HttpStatus.OK)
  async getTemplates(): Promise<{ code: number; message: string; data: ExportTemplateDto[] }> {
    return this.exportService.getTemplates();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createExport(
    @Body() exportRequest: ExportRequestDto,
  ): Promise<{ code: number; message: string; data: ExportResponseDto }> {
    const query: GetTracksQueryDto = {
      page: 1,
      limit: 1000,
      showId: exportRequest.showId,
    };

    const [tracksResult, materials] = await Promise.all([
      this.trackService.findAll(query),
      this.materialService.findAll(),
    ]);

    const notes: Array<{ id: string; trackId: string; content: string; createdBy: string; createdByName: string; previousNoteId: string | null; isActive: boolean; createdAt: Date }> = [];
    for (const track of tracksResult.data) {
      const trackNotes = await this.noteService.findByTrackId(track.id, {});
      notes.push(...trackNotes.data);
    }

    const result = await this.exportService.export(
      exportRequest,
      tracksResult.data,
      materials,
      notes,
    );

    return {
      code: 0,
      message: '导出任务已创建',
      data: result,
    };
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @Query() filter: ExportFilterDto,
  ): Promise<{ code: number; message: string; data: { data: ExportHistoryDto[]; total: number; page: number; limit: number } }> {
    const result = await this.exportService.getHistory(filter);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }
}
