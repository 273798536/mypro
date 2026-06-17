import { IsString, IsOptional, IsUUID, IsArray, IsEnum } from 'class-validator';

export type ReviewType = 'timecode' | 'quality' | 'note' | 'final';
export type ReviewDecision = 'approve' | 'reject' | 'suspend' | 'pass';
export type TimecodeCheckStatus = 'pass' | 'warning' | 'suspend';

export class CreateReviewDto {
  @IsUUID()
  trackId: string;

  @IsUUID()
  reviewerId: string;

  @IsString()
  reviewerName: string;

  @IsEnum(['timecode', 'quality', 'note', 'final'])
  reviewType: ReviewType;

  @IsEnum(['approve', 'reject', 'suspend', 'pass'])
  decision: ReviewDecision;

  @IsString()
  comment: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceMissing?: string[];
}

export class ResolveSuspendDto {
  @IsUUID()
  trackId: string;

  @IsUUID()
  reviewerId: string;

  @IsString()
  reviewerName: string;

  @IsEnum(['approve', 'reject', 'suspend'])
  decision: Exclude<ReviewDecision, 'pass'>;

  @IsString()
  comment: string;

  @IsOptional()
  @IsString()
  overrideReason?: string;
}

export class TimecodeCheckResultDto {
  status: TimecodeCheckStatus;
  deviation: number;
  message: string;
}

export class ReviewRecordDto {
  id: string;
  trackId: string;
  reviewerId: string;
  reviewerName: string;
  reviewType: ReviewType;
  decision: ReviewDecision;
  comment: string;
  evidenceMissing?: string[];
  timecodeCheck?: TimecodeCheckResultDto;
  createdAt: Date;
}
