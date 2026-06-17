import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { FileDto, UploadFileDto, FileUploadResponseDto, GetFilesQueryDto } from './file.dto';

@Controller()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('files/upload')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadFileDto: UploadFileDto,
  ): Promise<{ code: number; message: string; data: FileUploadResponseDto }> {
    const result = await this.fileService.uploadFiles(files, uploadFileDto);
    return {
      code: 0,
      message: result.failed > 0 ? `部分文件上传失败，成功 ${result.success}/${result.total}` : '文件上传成功',
      data: result,
    };
  }

  @Get('files')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: GetFilesQueryDto,
  ): Promise<{ code: number; message: string; data: { data: FileDto[]; total: number; page: number; limit: number } }> {
    const result = await this.fileService.findAll(query);
    return {
      code: 0,
      message: 'success',
      data: result,
    };
  }

  @Get('files/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
  ): Promise<{ code: number; message: string; data: FileDto }> {
    const file = await this.fileService.findOne(id);
    return {
      code: 0,
      message: 'success',
      data: file,
    };
  }

  @Delete('files/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.fileService.remove(id);
  }
}
