import { AttachmentType, StateAction } from '../types/enums'
import { prisma } from '../lib/prisma'
import { recordChangeLog } from './stateMachine'
import fs from 'fs'
import path from 'path'
import { config } from '../config'

export class AttachmentService {
  async uploadAttachment(
    receiptId: string,
    file: Express.Multer.File,
    type: AttachmentType,
    uploadedBy: string,
    description?: string
  ) {
    const receipt = await prisma.materialReceipt.findUnique({
      where: { id: receiptId }
    })
    if (!receipt) {
      throw new Error('回执不存在')
    }

    const uploadDir = config.uploadDir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const fileName = `${Date.now()}-${file.originalname}`
    const filePath = path.join(uploadDir, fileName)
    fs.writeFileSync(filePath, file.buffer)

    const attachment = await prisma.attachment.create({
      data: {
        receiptId,
        type,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        fileUrl: `/uploads/${fileName}`,
        uploadedBy,
        description
      }
    })

    await recordChangeLog(
      receiptId,
      StateAction.UPLOAD_ATTACHMENT,
      uploadedBy,
      null,
      { attachmentId: attachment.id, type } as any,
      `上传附件: ${file.originalname}`
    )

    return attachment
  }

  async getAttachments(receiptId: string) {
    return prisma.attachment.findMany({
      where: { receiptId },
      orderBy: { uploadedAt: 'desc' }
    })
  }

  async getAttachment(id: string) {
    return prisma.attachment.findUnique({
      where: { id }
    })
  }

  async deleteAttachment(id: string, operatorId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    })
    if (!attachment) {
      throw new Error('附件不存在')
    }

    const filePath = path.join(process.cwd(), attachment.fileUrl)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    await prisma.attachment.delete({
      where: { id }
    })

    return true
  }
}

export const attachmentService = new AttachmentService()
