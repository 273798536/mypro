import { IsString, IsOptional, IsArray, IsEnum, IsNumber } from 'class-validator';

export type ExportTemplateType =
  | 'scene_communication'
  | 'operation_verification'
  | 'complete_detail'
  | 'timecode_special';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export class ExportTemplateDto {
  id: ExportTemplateType;
  name: string;
  description: string;
  columns: string[];
  useCase: string;
}

export class ExportRequestDto {
  @IsEnum(['scene_communication', 'operation_verification', 'complete_detail', 'timecode_special'])
  templateId: ExportTemplateType;

  @IsOptional()
  @IsString()
  showId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trackIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(['pending', 'matching', 'matched', 'mismatch', 'reviewing', 'suspended', 'approved', 'rejected'], { each: true })
  statuses?: string[];

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsString()
  exportedBy: string;

  @IsString()
  exportedByName: string;
}

export class ExportHistoryDto {
  id: string;
  templateId: ExportTemplateType;
  templateName: string;
  showId?: string;
  trackCount: number;
  exportedBy: string;
  exportedByName: string;
  status: ExportStatus;
  fileName?: string;
  fileSize?: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class ExportResponseDto {
  id: string;
  templateId: ExportTemplateType;
  templateName: string;
  status: ExportStatus;
  fileName?: string;
  downloadUrl?: string;
  createdAt: Date;
}

export class ExportFilterDto {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  status?: ExportStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
