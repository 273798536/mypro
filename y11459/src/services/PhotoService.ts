import { Repository } from 'typeorm';
import { ExceptionPhoto } from '../entities/ExceptionPhoto';
import { AppDataSource } from '../database';
import { auditService } from './AuditService';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadPhotoOptions {
  refundId?: string;
  batchId?: string;
  file: Express.Multer.File;
  uploadedBy?: string;
  description?: string;
  photoType?: string;
}

export class PhotoService {
  private photoRepository: Repository<ExceptionPhoto>;
  private uploadDir: string;

  constructor() {
    this.photoRepository = AppDataSource.getRepository(ExceptionPhoto);
    this.uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadPhoto(options: UploadPhotoOptions): Promise<ExceptionPhoto> {
    const { file, refundId, batchId, uploadedBy, description, photoType } = options;

    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const photo = this.photoRepository.create({
      refundId,
      batchId,
      fileName: file.originalname,
      filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      photoType,
      uploadedBy,
      description,
      createdBy: uploadedBy,
      updatedBy: uploadedBy,
    });

    const saved = await this.photoRepository.save(photo);

    await auditService.logCreate('exception_photo', saved.id, saved, {
      batchId,
      operatorId: uploadedBy,
    });

    return saved;
  }

  async getPhotosByRefund(refundId: string): Promise<ExceptionPhoto[]> {
    return await this.photoRepository.find({
      where: { refundId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPhotosByBatch(batchId: string): Promise<ExceptionPhoto[]> {
    return await this.photoRepository.find({
      where: { batchId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPhotoById(id: string): Promise<ExceptionPhoto | null> {
    return await this.photoRepository.findOne({ where: { id } });
  }

  async deletePhoto(id: string, operatorId?: string): Promise<void> {
    const photo = await this.getPhotoById(id);
    if (!photo) {
      throw new Error('照片不存在');
    }

    if (fs.existsSync(photo.filePath)) {
      fs.unlinkSync(photo.filePath);
    }

    await this.photoRepository.delete(id);

    await auditService.logDelete('exception_photo', id, photo, {
      batchId: photo.batchId,
      operatorId,
    });
  }
}

export const photoService = new PhotoService();
