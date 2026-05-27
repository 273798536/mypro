import { Op, Transaction } from 'sequelize';
import { LostCard, GraduationStatus, RefundRecord, Card } from '../models';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class ValidationService {
  static async validateStudent(studentId: string, cardNo: string, transaction?: Transaction): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const card = await Card.findOne({ where: { studentId, cardNo }, transaction });
    if (!card) {
      errors.push('未找到卡片信息');
      return { valid: false, errors, warnings };
    }

    const lostCardCheck = await this.checkLostCard(studentId, cardNo, transaction);
    if (!lostCardCheck.valid) {
      errors.push(...lostCardCheck.errors);
    }
    warnings.push(...lostCardCheck.warnings);

    const graduationCheck = await this.checkGraduationStatus(studentId, transaction);
    if (!graduationCheck.valid) {
      errors.push(...graduationCheck.errors);
    }
    warnings.push(...graduationCheck.warnings);

    const duplicateCheck = await this.checkDuplicateRefund(studentId, transaction);
    if (!duplicateCheck.valid) {
      errors.push(...duplicateCheck.errors);
    }
    warnings.push(...duplicateCheck.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static async checkLostCard(studentId: string, cardNo: string, transaction?: Transaction): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const lostCard = await LostCard.findOne({
      where: {
        studentId,
        cardNo,
        status: { [Op.in]: ['pending', 'confirmed'] }
      },
      transaction
    });

    if (lostCard) {
      errors.push(`卡片已挂失，挂失时间: ${lostCard.lostDate.toLocaleString()}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static async checkGraduationStatus(studentId: string, transaction?: Transaction): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const graduation = await GraduationStatus.findOne({ where: { studentId }, transaction });

    if (!graduation) {
      errors.push('未查询到离校状态');
    } else if (graduation.status === 'pending') {
      warnings.push('离校手续待确认');
    } else if (graduation.status === 'rejected') {
      errors.push(`离校手续被拒绝: ${graduation.remarks || '无备注'}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static async checkDuplicateRefund(studentId: string, transaction?: Transaction): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const existingRefund = await RefundRecord.findOne({
      where: {
        studentId,
        status: { [Op.in]: ['pending', 'approved', 'processed'] }
      },
      transaction
    });

    if (existingRefund) {
      errors.push(`学生已有退款申请，批次号: ${existingRefund.batchNo}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

export default ValidationService;
