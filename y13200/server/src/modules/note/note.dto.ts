import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class NoteDto {
  id: string;
  trackId: string;
  content: string;
  createdBy: string;
  createdByName: string;
  previousNoteId: string | null;
  isActive: boolean;
  createdAt: Date;
}

export class CreateNoteDto {
  @IsUUID()
  trackId: string;

  @IsString()
  content: string;

  @IsString()
  createdBy: string;

  @IsString()
  createdByName: string;

  @IsOptional()
  @IsUUID()
  previousNoteId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetNotesQueryDto {
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}
