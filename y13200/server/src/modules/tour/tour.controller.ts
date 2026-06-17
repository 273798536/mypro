import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TourService } from './tour.service';
import { TourDto, TourStatsDto, GetToursQueryDto, CreateTourDto, UpdateTourDto } from './tour.dto';

@Controller()
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @Get('tours')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: GetToursQueryDto,
  ): Promise<{ code: number; message: string; data: { data: TourDto[]; total: number; page: number; limit: number } }> {
    const result = await this.tourService.findAll(query);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  @Get('tours/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
  ): Promise<{ code: number; message: string; data: TourDto }> {
    const tour = await this.tourService.findOne(id);
    return {
      code: 0,
      message: 'success',
      data: tour,
    };
  }

  @Get('tours/:id/stats')
  @HttpCode(HttpStatus.OK)
  async getStats(
    @Param('id') id: string,
  ): Promise<{ code: number; message: string; data: TourStatsDto }> {
    const stats = await this.tourService.getStats(id);
    return {
      code: 0,
      message: 'success',
      data: stats,
    };
  }

  @Post('tours')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTourDto: CreateTourDto,
  ): Promise<{ code: number; message: string; data: TourDto }> {
    const tour = await this.tourService.create(createTourDto);
    return {
      code: 0,
      message: '巡演创建成功',
      data: tour,
    };
  }

  @Put('tours/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateTourDto: UpdateTourDto,
  ): Promise<{ code: number; message: string; data: TourDto }> {
    const tour = await this.tourService.update(id, updateTourDto);
    return {
      code: 0,
      message: '巡演更新成功',
      data: tour,
    };
  }

  @Delete('tours/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.tourService.remove(id);
  }
}
