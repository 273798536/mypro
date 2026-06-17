import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export type TrackStatus =
  | 'pending'
  | 'matching'
  | 'matched'
  | 'mismatch'
  | 'reviewing'
  | 'suspended'
  | 'approved'
  | 'rejected';

export const TrackStatusEnum = {
  PENDING: 'pending' as TrackStatus,
  MATCHING: 'matching' as TrackStatus,
  MATCHED: 'matched' as TrackStatus,
  MISMATCH: 'mismatch' as TrackStatus,
  REVIEWING: 'reviewing' as TrackStatus,
  SUSPENDED: 'suspended' as TrackStatus,
  APPROVED: 'approved' as TrackStatus,
  REJECTED: 'rejected' as TrackStatus,
};

export class TrackDto {
  id: string;
  showId: string;
  trackNo: number;
  title: string;
  artist: string;
  expectedDuration: number;
  expectedTimecode?: string;
  status: TrackStatus;
  currentFileId?: string;
  currentVersion: number;
  latestNote?: string;
  timecodeDeviation?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class GetTracksQueryDto {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  showId?: string;

  @IsOptional()
  @IsEnum(TrackStatusEnum)
  status?: TrackStatus;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreateTrackDto {
  @IsString()
  showId: string;

  @IsNumber()
  trackNo: number;

  @IsString()
  title: string;

  @IsString()
  artist: string;

  @IsNumber()
  expectedDuration: number;

  @IsOptional()
  @IsString()
  expectedTimecode?: string;
}

export class UpdateTrackStatusDto {
  @IsEnum(TrackStatusEnum)
  status: TrackStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  operator?: string;
}

export class UpdateTrackDto {
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
  @IsNumber()
  expectedDuration?: number;

  @IsOptional()
  @IsString()
  expectedTimecode?: string;
}
