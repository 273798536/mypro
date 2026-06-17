import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TrackService } from './track.service';
import {
  TrackDto,
  GetTracksQueryDto,
  CreateTrackDto,
  UpdateTrackStatusDto,
  UpdateTrackDto,
} from './track.dto';

@Controller()
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Get('tracks')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: GetTracksQueryDto,
  ): Promise<{ code: number; message: string; data: { data: TrackDto[]; total: number; page: number; limit: number } }> {
    const result = await this.trackService.findAll(query);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  @Get('tracks/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
  ): Promise<{ code: number; message: string; data: TrackDto }> {
    const track = await this.trackService.findOne(id);
    return {
      code: 0,
      message: 'success',
      data: track,
    };
  }

  @Post('tracks')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTrackDto: CreateTrackDto,
  ): Promise<{ code: number; message: string; data: TrackDto }> {
    const track = await this.trackService.create(createTrackDto);
    return {
      code: 0,
      message: '曲目创建成功',
      data: track,
    };
  }

  @Put('tracks/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateTrackDto: UpdateTrackDto,
  ): Promise<{ code: number; message: string; data: TrackDto }> {
    const track = await this.trackService.update(id, updateTrackDto);
    return {
      code: 0,
      message: '曲目更新成功',
      data: track,
    };
  }

  @Put('tracks/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateTrackStatusDto: UpdateTrackStatusDto,
  ): Promise<{ code: number; message: string; data: TrackDto }> {
    const track = await this.trackService.updateStatus(id, updateTrackStatusDto);
    return {
      code: 0,
      message: '状态更新成功',
      data: track,
    };
  }

  @Delete('tracks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.trackService.remove(id);
  }
}
