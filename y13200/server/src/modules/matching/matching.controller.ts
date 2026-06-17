import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MatchingService } from './matching.service';
import {
  AnalyzeMatchingDto,
  ConfirmMatchingDto,
  BatchMatchingDto,
  MatchResultDto,
  BatchMatchResultDto,
  ConfirmResultDto,
} from './matching.dto';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(
    @Body() analyzeDto: AnalyzeMatchingDto,
  ): Promise<{ code: number; message: string; data: MatchResultDto }> {
    const result = await this.matchingService.analyze(analyzeDto);
    return {
      code: 0,
      message: '匹配分析完成',
      data: result,
    };
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Body() confirmDto: ConfirmMatchingDto,
  ): Promise<{ code: number; message: string; data: ConfirmResultDto }> {
    const result = await this.matchingService.confirm(confirmDto);
    return {
      code: 0,
      message: '匹配确认成功',
      data: result,
    };
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async batchMatch(
    @Body() batchDto: BatchMatchingDto,
  ): Promise<{ code: number; message: string; data: BatchMatchResultDto }> {
    const result = await this.matchingService.batchMatch(batchDto);
    return {
      code: 0,
      message: '批量匹配完成',
      data: result,
    };
  }
}
