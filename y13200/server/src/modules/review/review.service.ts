import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CreateReviewDto,
  ResolveSuspendDto,
  ReviewRecordDto,
  TimecodeCheckResultDto,
  TimecodeCheckStatus,
} from './review.dto';

@Injectable()
export class ReviewService {
  private reviews: Map<string, any[]> = new Map();
  private idCounter = 1;

  async findByTrackId(trackId: string): Promise<ReviewRecordDto[]> {
    const reviews = this.reviews.get(trackId) || [];
    return reviews.map(this.toResponseDto).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async create(createReviewDto: CreateReviewDto): Promise<ReviewRecordDto> {
    const { trackId, reviewType, ...reviewData } = createReviewDto;
    
    let timecodeCheck: TimecodeCheckResultDto | undefined;
    
    if (reviewType === 'timecode') {
      const track = await this.getTrack(trackId);
      const material = await this.getActiveMaterial(trackId);
      
      if (track?.expectedTimecode && material?.timecode) {
        timecodeCheck = this.checkTimecodeDeviation(
          material.timecode,
          track.expectedTimecode
        );
      }
    }

    const review = {
      id: `review-${this.idCounter++}`,
      trackId,
      reviewType,
      createdAt: new Date(),
      timecodeCheck,
      ...reviewData,
    };

    const existingReviews = this.reviews.get(trackId) || [];
    this.reviews.set(trackId, [...existingReviews, review]);

    return this.toResponseDto(review);
  }

  async resolveSuspend(resolveDto: ResolveSuspendDto): Promise<ReviewRecordDto> {
    const { trackId, decision, comment, reviewerId, reviewerName, overrideReason } = resolveDto;

    const suspendedReviews = await this.findByTrackId(trackId);
    const hasSuspended = suspendedReviews.some(r => r.decision === 'suspend');
    
    if (!hasSuspended) {
      throw new BadRequestException(`曲目 ${trackId} 没有挂起的复核记录`);
    }

    if (decision === 'approve' && !overrideReason) {
      const track = await this.getTrack(trackId);
      const material = await this.getActiveMaterial(trackId);
      
      if (track?.expectedTimecode && material?.timecode) {
        const check = this.checkTimecodeDeviation(material.timecode, track.expectedTimecode);
        if (check.status === 'suspend') {
          throw new BadRequestException(
            `时码偏差 ${check.deviation}ms 超过阈值，如需通过请提供 overrideReason`
          );
        }
      }
    }

    const review = {
      id: `review-${this.idCounter++}`,
      trackId,
      reviewerId,
      reviewerName,
      reviewType: 'timecode' as const,
      decision,
      comment,
      evidenceMissing: decision === 'reject' ? ['需要重新提交材料'] : undefined,
      createdAt: new Date(),
    };

    const existingReviews = this.reviews.get(trackId) || [];
    this.reviews.set(trackId, [...existingReviews, review]);

    return this.toResponseDto(review);
  }

  checkTimecodeDeviation(
    actualTimecode: string,
    expectedTimecode: string
  ): TimecodeCheckResultDto {
    const deviation = this.calculateDeviation(actualTimecode, expectedTimecode);
    const absDeviation = Math.abs(deviation);

    if (absDeviation <= 100) {
      return {
        status: 'pass',
        deviation,
        message: '时码偏差在允许范围内',
      };
    } else if (absDeviation <= 500) {
      return {
        status: 'warning',
        deviation,
        message: `时码轻微偏差：${deviation > 0 ? '+' : ''}${deviation}ms`,
      };
    } else {
      return {
        status: 'suspend',
        deviation,
        message: `时码偏差超过半拍（${deviation > 0 ? '+' : ''}${deviation}ms），已自动挂起，请现场老师确认`,
      };
    }
  }

  private parseTimecode(timecode: string): number {
    const parts = timecode.split(':');
    if (parts.length === 3) {
      const [minutes, seconds, ms] = parts;
      const [sec, millisec] = seconds.split('.');
      return parseInt(minutes, 10) * 60000 +
             parseInt(sec, 10) * 1000 +
             parseInt(millisec.padEnd(3, '0'), 10);
    }
    return 0;
  }

  private calculateDeviation(actual: string, expected: string): number {
    const actualMs = this.parseTimecode(actual);
    const expectedMs = this.parseTimecode(expected);
    return actualMs - expectedMs;
  }

  private async getTrack(trackId: string): Promise<{ expectedTimecode?: string } | null> {
    return {
      expectedTimecode: '00:03:45.000',
    };
  }

  private async getActiveMaterial(trackId: string): Promise<{ timecode?: string } | null> {
    return {
      timecode: '00:03:45.620',
    };
  }

  private toResponseDto(review: any): ReviewRecordDto {
    return {
      id: review.id,
      trackId: review.trackId,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewerName,
      reviewType: review.reviewType,
      decision: review.decision,
      comment: review.comment,
      evidenceMissing: review.evidenceMissing,
      timecodeCheck: review.timecodeCheck,
      createdAt: review.createdAt,
    };
  }
}
