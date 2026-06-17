import { Injectable, NotFoundException } from '@nestjs/common';
import { NoteDto, CreateNoteDto, GetNotesQueryDto } from './note.dto';

@Injectable()
export class NoteService {
  private notes: NoteDto[] = [
    {
      id: 'note-1',
      trackId: '1',
      content: '初版提交，时码正常',
      createdBy: 'operator-001',
      createdByName: '小孟',
      previousNoteId: null,
      isActive: false,
      createdAt: new Date('2026-06-10'),
    },
    {
      id: 'note-2',
      trackId: '1',
      content: 'v2版本，时码微调+150ms',
      createdBy: 'operator-001',
      createdByName: '小孟',
      previousNoteId: 'note-1',
      isActive: false,
      createdAt: new Date('2026-06-12'),
    },
    {
      id: 'note-3',
      trackId: '1',
      content: '时码偏半拍，待现场老师确认',
      createdBy: 'teacher-001',
      createdByName: '张老师',
      previousNoteId: 'note-2',
      isActive: true,
      createdAt: new Date('2026-06-14'),
    },
    {
      id: 'note-4',
      trackId: '3',
      content: '文件名缺少序号，待重新命名',
      createdBy: 'operator-001',
      createdByName: '小孟',
      previousNoteId: null,
      isActive: true,
      createdAt: new Date('2026-06-12'),
    },
  ];

  async findByTrackId(
    trackId: string,
    query: GetNotesQueryDto,
  ): Promise<{ data: NoteDto[] }> {
    let filteredNotes = this.notes.filter((note) => note.trackId === trackId);

    if (query.activeOnly) {
      filteredNotes = filteredNotes.filter((note) => note.isActive);
    }

    filteredNotes.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    return { data: filteredNotes };
  }

  async create(createNoteDto: CreateNoteDto): Promise<NoteDto> {
    const activeNote = this.notes.find(
      (note) => note.trackId === createNoteDto.trackId && note.isActive,
    );

    if (activeNote && createNoteDto.isActive !== false) {
      activeNote.isActive = false;
    }

    const previousNoteId = createNoteDto.previousNoteId || 
      (activeNote?.id || null);

    const newNote: NoteDto = {
      id: `note-${this.notes.length + 1}`,
      trackId: createNoteDto.trackId,
      content: createNoteDto.content,
      createdBy: createNoteDto.createdBy,
      createdByName: createNoteDto.createdByName,
      previousNoteId,
      isActive: createNoteDto.isActive !== false,
      createdAt: new Date(),
    };

    this.notes.push(newNote);
    return newNote;
  }

  async findOne(id: string): Promise<NoteDto> {
    const note = this.notes.find((n) => n.id === id);
    if (!note) {
      throw new NotFoundException(`备注ID ${id} 不存在`);
    }
    return note;
  }

  async getNoteChain(trackId: string): Promise<NoteDto[]> {
    const trackNotes = this.notes
      .filter((note) => note.trackId === trackId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return trackNotes;
  }

  async deactivateNote(id: string): Promise<NoteDto> {
    const note = await this.findOne(id);
    note.isActive = false;
    return note;
  }
}
