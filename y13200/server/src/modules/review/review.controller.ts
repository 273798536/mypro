import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, ResolveSuspendDto, ReviewRecordDto } from './review.dto';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('tracks/:id/reviews')
  @HttpCode(HttpStatus.OK)
  async getReviewsByTrackId(
    @Param('id') trackId: string,
  ): Promise<{ code: number; message: string; data: ReviewRecordDto[] }> {
    const reviews = await this.reviewService.findByTrackId(trackId);
    return {
      code: 0,
      message: 'success',
      data: reviews,
    };
  }

  @Post('reviews')
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<{ code: number; message: string; data: ReviewRecordDto }> {
    const review = await this.reviewService.create(createReviewDto);
    return {
      code: 0,
      message: '复核记录创建成功',
      data: review,
    };
  }

  @Post('reviews/suspend/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveSuspend(
    @Body() resolveDto: ResolveSuspendDto,
  ): Promise<{ code: number; message: string; data: ReviewRecordDto }> {
    const review = await this.reviewService.resolveSuspend(resolveDto);
    return {
      code: 0,
      message: '挂起项处理成功',
      data: review,
    };
  }
}
