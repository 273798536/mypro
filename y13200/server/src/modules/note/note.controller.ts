import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NoteService } from './note.service';
import { NoteDto, CreateNoteDto, GetNotesQueryDto } from './note.dto';

@Controller()
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get('tracks/:id/notes')
  @HttpCode(HttpStatus.OK)
  async findByTrackId(
    @Param('id') trackId: string,
    @Query() query: GetNotesQueryDto,
  ): Promise<{ code: number; message: string; data: { data: NoteDto[] }> {
    const result = await this.noteService.findByTrackId(trackId, query);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  @Post('notes')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createNoteDto: CreateNoteDto,
  ): Promise<{ code: number; message: string; data: NoteDto }> {
    const note = await this.noteService.create(createNoteDto);
    return {
      code: 0,
      message: '备注创建成功',
      data: note,
    };
  }
}
