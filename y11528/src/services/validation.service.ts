import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../config/database';
import {
  Declaration,
  TrajectoryNode,
  TaxNotice,
  BadDataRecord,
  BadDataType,
  BadDataStatus
} from '../entities';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  badDataId?: string;
}

export class ValidationService {
  async validateDeclaration(data: Record<string, any>, sourceFile?: string, rowNumber?: number): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.declarationNo) {
      errors.push('申报单号不能为空');
    } else {
      const existing = await getRepository(Declaration).findOne({
        where: { declarationNo: data.declarationNo }
      });
      if (existing) {
        errors.push(`申报单号 ${data.declarationNo} 已存在`);
        await this.createBadDataRecord(
          BadDataType.DUPLICATE_RECORD,
          'declaration',
          data,
          `申报单号重复: ${data.declarationNo}`,
          { existingId: existing.id },
          sourceFile,
          rowNumber
        );
      }
    }

    if (!data.packageNo) {
      errors.push('包裹号不能为空');
    }

    if (!data.senderName) {
      errors.push('发件人姓名不能为空');
    }

    if (!data.receiverName) {
      errors.push('收件人姓名不能为空');
    }

    if (!data.declaredValue) {
      errors.push('申报价值不能为空');
    } else if (isNaN(Number(data.declaredValue))) {
      errors.push('申报价值必须是数字');
    } else if (Number(data.declaredValue) <= 0) {
      errors.push('申报价值必须大于0');
    }

    if (!data.weight) {
      errors.push('重量不能为空');
    } else if (isNaN(Number(data.weight))) {
      errors.push('重量必须是数字');
    }

    if (!data.hsCode) {
      errors.push('HS编码不能为空');
    } else if (!/^[0-9]{6,10}$/.test(data.hsCode)) {
      errors.push('HS编码格式不正确，应为6-10位数字');
    }

    if (!data.hasAttachment) {
      warnings.push('缺少附件，将标记为异常记录');
    }

    if (errors.length > 0) {
      const badDataId = await this.createBadDataRecord(
        BadDataType.VALIDATION_ERROR,
        'declaration',
        data,
        errors.join('; '),
        { warnings },
        sourceFile,
        rowNumber
      );
      return { isValid: false, errors, warnings, badDataId };
    }

    return { isValid: true, errors, warnings };
  }

  async validateTrajectoryNode(data: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.declarationId) {
      errors.push('申报单ID不能为空');
    } else {
      const existing = await getRepository(Declaration).findOne({
        where: { id: data.declarationId }
      });
      if (!existing) {
        errors.push(`申报单ID ${data.declarationId} 不存在`);
      }
    }

    if (!data.nodeType) {
      errors.push('节点类型不能为空');
    }

    if (!data.nodeName) {
      errors.push('节点名称不能为空');
    }

    if (!data.occurredAt) {
      errors.push('发生时间不能为空');
    }

    if (errors.length > 0) {
      const badDataId = await this.createBadDataRecord(
        BadDataType.VALIDATION_ERROR,
        'trajectory',
        data,
        errors.join('; ')
      );
      return { isValid: false, errors, warnings, badDataId };
    }

    return { isValid: true, errors, warnings };
  }

  async validateTaxNotice(data: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.noticeNo) {
      errors.push('通知单号不能为空');
    } else {
      const existing = await getRepository(TaxNotice).findOne({
        where: { noticeNo: data.noticeNo }
      });
      if (existing) {
        errors.push(`通知单号 ${data.noticeNo} 已存在`);
        await this.createBadDataRecord(
          BadDataType.DUPLICATE_RECORD,
          'tax_notice',
          data,
          `通知单号重复: ${data.noticeNo}`,
          { existingId: existing.id }
        );
      }
    }

    if (!data.declarationId) {
      errors.push('申报单ID不能为空');
    }

    if (!data.packageNo) {
      errors.push('包裹号不能为空');
    }

    if (!data.taxAmount && data.taxAmount !== 0) {
      errors.push('税费金额不能为空');
    } else if (isNaN(Number(data.taxAmount))) {
      errors.push('税费金额必须是数字');
    }

    if (!data.taxCategory) {
      errors.push('税费类别不能为空');
    }

    if (!data.issueDate) {
      errors.push('签发日期不能为空');
    }

    if (errors.length > 0) {
      const badDataId = await this.createBadDataRecord(
        BadDataType.VALIDATION_ERROR,
        'tax_notice',
        data,
        errors.join('; ')
      );
      return { isValid: false, errors, warnings, badDataId };
    }

    return { isValid: true, errors, warnings };
  }

  private async createBadDataRecord(
    errorType: BadDataType,
    sourceType: string,
    rawData: Record<string, any>,
    errorMessage: string,
    errorDetails?: Record<string, any>,
    sourceFile?: string,
    sourceRow?: number
  ): Promise<string> {
    const badDataRepo = getRepository(BadDataRecord);
    const record = badDataRepo.create({
      id: uuidv4(),
      errorType,
      status: BadDataStatus.OPEN,
      sourceType,
      rawData,
      errorMessage,
      errorDetails,
      sourceFile,
      sourceRow,
      createdAt: new Date()
    });
    await badDataRepo.save(record);
    return record.id;
  }
}

export const validationService = new ValidationService();
