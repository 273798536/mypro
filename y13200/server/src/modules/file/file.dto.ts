import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export type FileType = 'audio' | 'image' | 'document' | 'other';

export const FileTypeEnum = {
  AUDIO: 'audio' as FileType,
  IMAGE: 'image' as FileType,
  DOCUMENT: 'document' as FileType,
  OTHER: 'other' as FileType,
};

export class FileDto {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: FileType;
  extension: string;
  trackId?: string;
  version: number;
  sourceBatch?: string;
  submittedBy?: string;
  duration?: number;
  parsedTrackNo?: number;
  parsedTitle?: string;
  timecode?: string;
  timecodeDeviation?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UploadFileDto {
  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsString()
  sourceBatch?: string;

  @IsOptional()
  @IsString()
  submittedBy?: string;

  @IsOptional()
  @IsNumber()
  version?: number;
}

export class FileUploadResponseDto {
  files: FileDto[];
  total: number;
  success: number;
  failed: number;
  errors?: Array<{ fileName: string; error: string }>;
}

export class GetFilesQueryDto {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsEnum(FileTypeEnum)
  fileType?: FileType;

  @IsOptional()
  @IsString()
  sourceBatch?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
