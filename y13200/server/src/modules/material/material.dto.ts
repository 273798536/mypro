import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateMaterialDto {
  @IsUUID()
  trackId: string;

  @IsUUID()
  fileId: string;

  @IsString()
  fileName: string;

  @IsOptional()
  @IsNumber()
  parsedTrackNo?: number;

  @IsOptional()
  @IsString()
  parsedTitle?: string;

  @IsNumber()
  duration: number;

  @IsOptional()
  @IsString()
  timecode?: string;

  @IsOptional()
  @IsNumber()
  timecodeDeviation?: number;

  @IsString()
  submittedBy: string;

  @IsString()
  sourceBatch: string;

  @IsOptional()
  @IsString()
  overrideReason?: string;
}

export class ActivateMaterialDto {
  @IsString()
  changedBy: string;

  @IsString()
  reason: string;
}

export class MaterialResponseDto {
  id: string;
  trackId: string;
  fileId: string;
  fileName: string;
  parsedTrackNo?: number;
  parsedTitle?: string;
  duration: number;
  timecode?: string;
  timecodeDeviation?: number;
  version: number;
  isActive: boolean;
  matchStatus: string;
  matchConfidence: number;
  submittedBy: string;
  submittedAt: Date;
  sourceBatch: string;
}

export class VersionDiffDto {
  fieldName: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  changeType: 'create' | 'update' | 'override';
}

export class VersionComparisonDto {
  materialId: string;
  versions: Array<{
    version: number;
    material: MaterialResponseDto;
    submittedAt: Date;
    submittedBy: string;
  }>;
  diffs: VersionDiffDto[];
}
