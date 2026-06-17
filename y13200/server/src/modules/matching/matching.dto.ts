import { IsString, IsNumber, IsArray, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ParsedFileName, MatchCandidate } from './match.engine';

export class AnalyzeMatchingDto {
  @IsUUID()
  materialId: string;

  @IsString()
  fileName: string;

  @IsNumber()
  actualDuration: number;

  @IsArray()
  candidates: MatchCandidate[];
}

export class ConfirmMatchingDto {
  @IsUUID()
  materialId: string;

  @IsUUID()
  trackId: string;

  @IsString()
  matchType: 'auto' | 'manual';

  @IsNumber()
  confidence: number;

  @IsString()
  confirmedBy: string;
}

export class BatchMatchingItemDto {
  @IsUUID()
  materialId: string;

  @IsString()
  fileName: string;

  @IsNumber()
  actualDuration: number;
}

export class BatchMatchingDto {
  @IsArray()
  items: BatchMatchingItemDto[];

  @IsArray()
  candidates: MatchCandidate[];
}

export class ParsedFileNameDto implements ParsedFileName {
  @IsOptional()
  @IsNumber()
  trackNo?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class MatchResultDto {
  materialId: string;
  trackId: string | null;
  confidence: number;
  matchType: 'auto' | 'suggest' | 'manual' | 'none';
  anomalies: string[];
  parsed?: ParsedFileNameDto;
}

export class BatchMatchResultDto {
  results: MatchResultDto[];
  summary: {
    total: number;
    autoMatched: number;
    suggested: number;
    manualRequired: number;
    unmatched: number;
  };
}

export class ConfirmResultDto {
  materialId: string;
  trackId: string;
  matchStatus: string;
  matchConfidence: number;
  confirmedBy: string;
  confirmedAt: Date;
}
