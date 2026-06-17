import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const ALLOWED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.aac', '.ogg', '.m4a'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];

const ensureDirExists = (dir: string): void => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

const getFileType = (fileName: string): string => {
  const ext = extname(fileName).toLowerCase();
  if (ALLOWED_AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
  return 'other';
};

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const fileType = getFileType(file.originalname);
          const typeDir = join(UPLOAD_DIR, fileType);
          ensureDirExists(typeDir);
          cb(null, typeDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const originalName = file.originalname.replace(ext, '').substring(0, 50);
          const fileName = `${uniqueSuffix}_${originalName}${ext}`;
          cb(null, fileName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const allowedExtensions = [
          ...ALLOWED_AUDIO_EXTENSIONS,
          ...ALLOWED_IMAGE_EXTENSIONS,
          ...ALLOWED_DOCUMENT_EXTENSIONS,
        ];

        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`不支持的文件类型: ${ext}`), false);
        }
      },
    }),
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
