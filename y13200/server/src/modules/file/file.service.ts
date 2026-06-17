import { Injectable, NotFoundException } from '@nestjs/common';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import {
  FileDto,
  FileType,
  UploadFileDto,
  FileUploadResponseDto,
  GetFilesQueryDto,
} from './file.dto';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const ALLOWED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.aac', '.ogg', '.m4a'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];

@Injectable()
export class FileService {
  private files: FileDto[] = [
    {
      id: '1',
      originalName: '01_夜曲_周杰伦_立体声_v3.wav',
      fileName: '1_20260614_152030_夜曲.wav',
      filePath: '/uploads/audio/1_20260614_152030_夜曲.wav',
      fileSize: 45234567,
      mimeType: 'audio/wav',
      fileType: 'audio',
      extension: '.wav',
      trackId: '1',
      version: 3,
      sourceBatch: 'BATCH-20260614-02',
      submittedBy: '小孟',
      duration: 225.3,
      parsedTrackNo: 1,
      parsedTitle: '夜曲',
      timecode: '00:03:45.620',
      timecodeDeviation: 620,
      createdAt: new Date('2026-06-14T15:20:30'),
      updatedAt: new Date('2026-06-14T15:20:30'),
    },
    {
      id: '2',
      originalName: '02_七里香_周杰伦_立体声_v2.wav',
      fileName: '2_20260613_103000_七里香.wav',
      filePath: '/uploads/audio/2_20260613_103000_七里香.wav',
      fileSize: 52345678,
      mimeType: 'audio/wav',
      fileType: 'audio',
      extension: '.wav',
      trackId: '2',
      version: 2,
      sourceBatch: 'BATCH-20260613-01',
      submittedBy: '小孟',
      duration: 298.2,
      parsedTrackNo: 2,
      parsedTitle: '七里香',
      timecode: '00:04:58.080',
      timecodeDeviation: 80,
      createdAt: new Date('2026-06-13T10:30:00'),
      updatedAt: new Date('2026-06-13T10:30:00'),
    },
  ];

  constructor() {
    this.ensureUploadDirExists();
  }

  async uploadFiles(
    files: Express.Multer.File[],
    uploadFileDto: UploadFileDto,
  ): Promise<FileUploadResponseDto> {
    const results: FileDto[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        const fileDto = this.processUploadedFile(file, uploadFileDto);
        results.push(fileDto);
      } catch (error) {
        errors.push({
          fileName: file.originalname,
          error: error.message,
        });
      }
    }

    return {
      files: results,
      total: files.length,
      success: results.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async findAll(query: GetFilesQueryDto): Promise<{ data: FileDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, trackId, fileType, sourceBatch, keyword } = query;

    let filteredFiles = [...this.files];

    if (trackId) {
      filteredFiles = filteredFiles.filter((file) => file.trackId === trackId);
    }

    if (fileType) {
      filteredFiles = filteredFiles.filter((file) => file.fileType === fileType);
    }

    if (sourceBatch) {
      filteredFiles = filteredFiles.filter((file) => file.sourceBatch === sourceBatch);
    }

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredFiles = filteredFiles.filter(
        (file) =>
          file.originalName.toLowerCase().includes(lowerKeyword) ||
          file.parsedTitle?.toLowerCase().includes(lowerKeyword),
      );
    }

    filteredFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

    return {
      data: paginatedFiles,
      total: filteredFiles.length,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<FileDto> {
    const file = this.files.find((f) => f.id === id);
    if (!file) {
      throw new NotFoundException(`文件ID ${id} 不存在`);
    }
    return file;
  }

  async remove(id: string): Promise<void> {
    const fileIndex = this.files.findIndex((f) => f.id === id);
    if (fileIndex === -1) {
      throw new NotFoundException(`文件ID ${id} 不存在`);
    }

    const file = this.files[fileIndex];
    const fullPath = join(process.cwd(), file.filePath);

    if (existsSync(fullPath)) {
      try {
        unlinkSync(fullPath);
      } catch (error) {
        console.warn(`删除文件失败: ${fullPath}`, error);
      }
    }

    this.files.splice(fileIndex, 1);
  }

  private processUploadedFile(
    file: Express.Multer.File,
    uploadFileDto: UploadFileDto,
  ): FileDto {
    const ext = extname(file.originalname).toLowerCase();
    const fileType = this.getFileType(file.originalname);
    const parsedInfo = this.parseFileName(file.originalname);

    const fileDto: FileDto = {
      id: String(this.files.length + 1),
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path.replace(process.cwd(), ''),
      fileSize: file.size,
      mimeType: file.mimetype,
      fileType,
      extension: ext,
      trackId: uploadFileDto.trackId,
      version: uploadFileDto.version || 1,
      sourceBatch: uploadFileDto.sourceBatch,
      submittedBy: uploadFileDto.submittedBy,
      parsedTrackNo: parsedInfo.trackNo,
      parsedTitle: parsedInfo.title,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.files.push(fileDto);
    return fileDto;
  }

  private getFileType(fileName: string): FileType {
    const ext = extname(fileName).toLowerCase();

    if (ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
      return 'audio';
    }
    if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return 'image';
    }
    if (ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
      return 'document';
    }
    return 'other';
  }

  private parseFileName(fileName: string): { trackNo?: number; title?: string } {
    const match = fileName.match(/^(\d+)[_\- ]+(.+?)(?:[_\- ]+.*)?\.[^.]+$/);
    if (match) {
      return {
        trackNo: parseInt(match[1], 10),
        title: match[2].trim(),
      };
    }
    return {};
  }

  private ensureUploadDirExists(): void {
    this.ensureDirExists(UPLOAD_DIR);
    this.ensureDirExists(join(UPLOAD_DIR, 'audio'));
    this.ensureDirExists(join(UPLOAD_DIR, 'image'));
    this.ensureDirExists(join(UPLOAD_DIR, 'document'));
    this.ensureDirExists(join(UPLOAD_DIR, 'other'));
  }

  private ensureDirExists(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
